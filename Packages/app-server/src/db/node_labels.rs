use futures_util::TryStreamExt;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::{async_graphql, GQLError};
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::anyhow::{self, Error};
use rust_shared::tokio_postgres::{IsolationLevel, Row};
use crate::utils::db::accessors::{get_db_entry, AccessorContext};
use crate::gql_set_impl;
use crate::utils::db::filter::FilterInput;
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::store::storage::get_app_state_from_gql_ctx;
use crate::db::general::sign_in_::jwt_utils::try_get_user_jwt_data_from_gql_ctx;
use super::general::sign_in_::jwt_utils::get_user_info_from_gql_ctx;
use super::general::subtree_collector::params;

const DEFAULT_LABELS_FETCH_LIMIT: i64 = 30;

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct NodeLabel {
    pub label: String,
    /// Total no. of nodes that have used this label
    pub usage_count: i64,
    /// Whether the current user is the creator of this label
    /// if the user has provided a node id in [NodeLabelsInput] to filter by (otherwise this will always be None)
    pub is_creator: Option<bool>,
}

impl NodeLabel {
    pub fn from_row(row: &Row) -> anyhow::Result<Self> {
        Ok(Self {
            label: row.try_get("label")?,
            usage_count: row.try_get("cnt")?,
            is_creator: row.try_get("is_creator").ok(),
        })
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct NodeLabelsInput {
    limit: i64,
    /// Text to filter labels by. If provided, only labels containing this string will be returned
    /// else we'll return the most used labels
    search_text: Option<String>,
    /// If provided, only labels used by the specified node will be returned
    node_id: Option<String>,
}

#[derive(Default)]
pub struct QueryShard_NodeLabel;

#[Object]
impl QueryShard_NodeLabel {
    async fn nodeLabels(&self, gql_ctx: &Context<'_>, filter: NodeLabelsInput) -> Result<Vec<NodeLabel>, GQLError> {
        let limit = filter.limit;
        let mut anchor = DataAnchorFor1::empty();
        let ctx = AccessorContext::new_read_base(&mut anchor, Some(gql_ctx), &get_app_state_from_gql_ctx(gql_ctx).db_pool, try_get_user_jwt_data_from_gql_ctx(gql_ctx).await?, false, IsolationLevel::ReadCommitted).await?;

        // we only use actor information to determine whether they're the creator of a label or not(when a node_id is provided),
        // but this isn't crucial information, if it's being accessed publicly, we can put out the actor as empty string
        // which will basically result in is_creator to be false
        let actor = match get_user_info_from_gql_ctx(gql_ctx, &ctx).await{
            Ok(user) => user.id.to_string(),
            Err(_) => String::from(""),
        };

        let rows: Vec<Row> = match (filter.search_text.as_ref(), filter.node_id.as_ref()) {
            (Some(search_text), Some(node_id)) => {
                let like_pattern = format!("{search_text}%");
                let query = r#"
                    SELECT l."label", COUNT(DISTINCT l."nodeId")::bigint AS cnt
                    FROM app."nodeToLabel" l
                    WHERE l."label" LIKE $1
                      AND l."nodeId" = $2
                    GROUP BY l."label"
                    ORDER BY cnt DESC, l."label" ASC
                    LIMIT $3;
                "#;
                ctx.tx.query_raw(query, params(&[&like_pattern, node_id, &limit])).await?.try_collect().await?
            }
            (None, Some(node_id)) => {
                let query = r#"
                    SELECT l."label",
                           COUNT(DISTINCT n."nodeId")::bigint AS cnt,
                           BOOL_OR(l."creator" = $2) AS is_creator
                    FROM app."nodeToLabel" l
                    JOIN app."nodeToLabel" n USING ("label")
                    WHERE l."nodeId" = $1
                    GROUP BY l."label"
                    ORDER BY cnt DESC, l."label"
                    LIMIT $3;
                "#;
                ctx.tx.query_raw(query, params(&[node_id, &actor, &limit])).await?.try_collect().await?
            }
            (Some(search_text), None) => {
                let like_pattern = format!("{search_text}%");
                let query = r#"
                    SELECT l."label", COUNT(DISTINCT l."nodeId")::bigint AS cnt
                    FROM app."nodeToLabel" l
                    WHERE l."label" LIKE $1
                    GROUP BY l."label"
                    ORDER BY cnt DESC, l."label" ASC
                    LIMIT $2;
                "#;
                ctx.tx.query_raw(query, params(&[&like_pattern, &limit])).await?.try_collect().await?
            }
            (None, None) => {
                let query = r#"
                    SELECT l."label", COUNT(DISTINCT l."nodeId")::bigint AS cnt
                    FROM app."nodeToLabel" l
                    GROUP BY l."label"
                    ORDER BY cnt DESC, l."label" ASC
                    LIMIT $1;
                "#;
                ctx.tx.query_raw(query, params(&[&limit])).await?.try_collect().await?
            }
        };

        let usages: Vec<NodeLabel> = rows.iter()
            .map(|r| NodeLabel::from_row(r).unwrap())
            .collect();

        Ok(usages)

    }
}

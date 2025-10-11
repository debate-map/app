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
use super::general::subtree_collector::params;

const DEFAULT_LABELS_FETCH_LIMIT: i64 = 30;

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct NodeLabel {
    pub label: String,
    /// Total no. of nodes that have used this label
    pub usage_count: i64,
}

impl NodeLabel {
    pub fn from_row(row: &Row) -> anyhow::Result<Self> {
        Ok(Self {
            label: row.try_get("label")?,
            usage_count: row.try_get("cnt")?,
        })
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct NodeLabelsInput {
    /// The maximum number of labels to return, default is [DEFAULT_LABELS_FETCH_LIMIT]
    limit: Option<i64>,
    /// Text to filter labels by. If provided, only labels containing this string will be returned
    /// else we'll return the most used labels
    search_text: Option<String>,
}

impl Default for NodeLabelsInput {
    fn default() -> Self {
        Self {
            limit : Some(DEFAULT_LABELS_FETCH_LIMIT),
            search_text : None
        }
    }
}

#[derive(Default)]
pub struct QueryShard_NodeLabel;

#[Object]
impl QueryShard_NodeLabel {
    async fn nodeLabels(&self, gql_ctx: &Context<'_>, filter: Option<NodeLabelsInput>) -> Result<Vec<NodeLabel>, GQLError> {
        let filter = match filter {
            Some(filter) => filter,
            None => {
                NodeLabelsInput::default()
            }
        };
        let limit = filter.limit.unwrap_or(DEFAULT_LABELS_FETCH_LIMIT);

        let mut anchor = DataAnchorFor1::empty();
        let ctx = AccessorContext::new_read_base(&mut anchor, Some(gql_ctx), &get_app_state_from_gql_ctx(gql_ctx).db_pool, try_get_user_jwt_data_from_gql_ctx(gql_ctx).await?, false, IsolationLevel::ReadCommitted).await?;

        match filter.search_text {
            Some(search_text) => {
                let like_pattern = format!("{}%", search_text);
                let query = r#"
                    SELECT l."label", COUNT(*)::bigint AS cnt
                    FROM app."node_label" l
                    WHERE lower(l."label") LIKE lower($1)
                    GROUP BY l."label"
                    ORDER BY cnt DESC, l."label" ASC
                    LIMIT $2;
                "#;

                let rows: Vec<Row> = ctx.tx
                    .query_raw(query, params(&[&like_pattern, &limit]))
                    .await?
                    .try_collect()
                    .await?;

                let usages: Vec<NodeLabel> = rows.iter().map(|r| NodeLabel::from_row(r).unwrap()).collect();
                Ok(usages)
            },
            None => {
                let query = r#"
                    SELECT l."label", COUNT(*)::bigint AS cnt
                    FROM app."node_label" l
                    GROUP BY l."label" ORDER BY cnt DESC, l."label" ASC LIMIT $1;
                "#;

                let rows: Vec<Row> = ctx.tx.query_raw(query, params(&[&limit])).await?.try_collect().await?;
                let usages: Vec<NodeLabel> = rows.iter().map(|row| NodeLabel::from_row(row).unwrap()).collect();

                Ok(usages)
            }
        }
    }
}

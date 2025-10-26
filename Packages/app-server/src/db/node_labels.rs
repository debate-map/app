use futures_util::{stream, Stream, TryFutureExt, TryStreamExt};
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::{async_graphql, GQLError};
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::anyhow::{self, Error};
use rust_shared::tokio_postgres::{IsolationLevel, Row};
use crate::utils::db::accessors::{get_db_entry, AccessorContext};
use crate::gql_set_impl;
use crate::utils::db::filter::FilterInput;
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::store::storage::get_app_state_from_gql_ctx;
use crate::db::general::sign_in_::jwt_utils::try_get_user_jwt_data_from_gql_ctx;
use super::general::sign_in_::jwt_utils::get_user_info_from_gql_ctx;
use super::general::subtree_collector::params;
use rust_shared::{SubError};
use crate::utils::db::generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet};
use rust_shared::rust_macros::wrap_slow_macros;

const DEFAULT_LABELS_FETCH_LIMIT: i64 = 30;

wrap_slow_macros! {

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NodeLabel {
    pub id: String,
    pub created_at: i64,
    pub creator: String,
    pub label: String,
    pub node_id: String,
}

impl From<Row> for NodeLabel {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct NodeLabelExt {
    pub label: String,
    /// Total no. of nodes that have used this label
    pub usage_count: i64,
    /// Whether the current user is the creator of this label
    /// if the user has provided a node id in [NodeLabelsInput] to filter by (otherwise this will always be None)
    pub is_creator: Option<bool>,
}

impl NodeLabelExt {
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
    async fn nodeLabels(&self, gql_ctx: &Context<'_>, filter: NodeLabelsInput) -> Result<Vec<NodeLabelExt>, GQLError> {
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
                    FROM app."nodeLabels" l
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
                    FROM app."nodeLabels" l
                    JOIN app."nodeLabels" n USING ("label")
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
                    FROM app."nodeLabels" l
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
                    FROM app."nodeLabels" l
                    GROUP BY l."label"
                    ORDER BY cnt DESC, l."label" ASC
                    LIMIT $1;
                "#;
                ctx.tx.query_raw(query, params(&[&limit])).await?.try_collect().await?
            }
        };

        let usages: Vec<NodeLabelExt> = rows.iter()
            .map(|r| NodeLabelExt::from_row(r).unwrap())
            .collect();

        Ok(usages)
    }
}

gql_set_impl!(NodeLabel);

#[derive(Default)]
pub struct SubscriptionShard_NodeLabel;

#[Subscription]
impl SubscriptionShard_NodeLabel {
    async fn nodeLabels<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeLabel, SubError>> + 'a {
        handle_generic_gql_collection_subscription::<NodeLabel, GQLSet_NodeLabel>(ctx, "nodeLabels", filter, None).await
    }
    async fn nodeLabel<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeLabel>, SubError>> + 'a {
        handle_generic_gql_doc_subscription::<NodeLabel>(ctx, "nodeLabels", id).await
    }
}

}

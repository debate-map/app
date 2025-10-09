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

#[derive(Serialize)]
pub struct NodeLabel {
    pub id: String,
    pub label: String,
}

impl TryFrom<Row> for NodeLabel {
    type Error = Error;
    fn try_from(row: Row) -> Result<Self, Error> {
        Ok(Self {
            id: row.try_get("id")?,
            label: row.try_get("label")?,
        })
    }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct NodeLabelExt {
    pub id: String,
    pub label: String,
    /// Total no. of nodes that have used this label
    pub usage_count: i64,
}

impl NodeLabelExt {
    pub fn from_row(row: &Row) -> anyhow::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            label: row.try_get("label")?,
            usage_count: row.try_get("cnt")?,
        })
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct NodeLabelsInput {
    /// The maximum number of labels to return, default is [DEFAULT_LABELS_FETCH_LIMIT]
    limit: Option<i64>,
    /// A search query to filter labels by. If provided, only labels containing this string will be returned
    /// else we'll return the most used labels
    query: Option<String>,
}

impl Default for NodeLabelsInput {
    fn default() -> Self {
        Self {
            limit : Some(DEFAULT_LABELS_FETCH_LIMIT),
            query : None
        }
    }
}

#[derive(Default)]
pub struct QueryShard_NodeLabel;

#[Object]
impl QueryShard_NodeLabel {
    async fn nodeLabels(&self, gql_ctx: &Context<'_>, filter: Option<NodeLabelsInput>) -> Result<Vec<NodeLabelExt>, GQLError> {
        let filter = match filter {
            Some(filter) => filter,
            None => {
                NodeLabelsInput::default()
            }
        };
        let limit = filter.limit.unwrap_or(DEFAULT_LABELS_FETCH_LIMIT);

        let mut anchor = DataAnchorFor1::empty();
        let ctx = AccessorContext::new_read_base(&mut anchor, Some(gql_ctx), &get_app_state_from_gql_ctx(gql_ctx).db_pool, try_get_user_jwt_data_from_gql_ctx(gql_ctx).await?, false, IsolationLevel::ReadCommitted).await?;

        match filter.query {
            Some(_query) => {
                Ok(vec![])
            },
            None => {
                let query = r#"
                    SELECT l."id", l."label", COUNT(*) AS cnt
                    FROM app."label_node" j
                    JOIN app."nodeLabels" l ON l."id" = j."nodeLabelId"
                    GROUP BY l."id", l."label"
                    ORDER BY cnt DESC
                    LIMIT $1
                "#;

                let rows: Vec<Row> = ctx.tx.query_raw(query, params(&[&limit])).await?.try_collect().await?;
                let usages: Vec<NodeLabelExt> = rows.iter().map(|row| NodeLabelExt::from_row(row).unwrap()).collect();

                Ok(usages)
            }
        }
    }
}

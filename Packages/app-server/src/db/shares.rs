use rust_shared::serde_json::json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json, async_graphql};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject, Enum};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;
use rust_shared::anyhow::Error;

use crate::utils::db::accessors::{AccessorContext, get_db_entry};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

use super::commands::_command::{FieldUpdate_Nullable, FieldUpdate};

pub async fn get_share(ctx: &AccessorContext<'_>, id: &str) -> Result<Share, Error> {
    get_db_entry(ctx, "shares", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum ShareType {
    #[graphql(name = "map")] map,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Share {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub name: String,
    pub r#type: ShareType,
	pub mapID: Option<String>,
	pub mapView: JSONValue,
}
impl From<Row> for Share {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct ShareInput {
    pub name: String,
	pub r#type: ShareType,
    pub mapID: Option<String>,
    pub mapView: JSONValue,
}

#[derive(InputObject, Deserialize)]
pub struct ShareUpdates {
    pub name: FieldUpdate<String>,
	//pub r#type: FieldUpdate<ShareType>,
    pub mapID: FieldUpdate_Nullable<String>,
    pub mapView: FieldUpdate<JSONValue>,
}

#[derive(Clone)] pub struct GQLSet_Share { pub nodes: Vec<Share> }
#[Object] impl GQLSet_Share { async fn nodes(&self) -> &Vec<Share> { &self.nodes } }
impl GQLSet<Share> for GQLSet_Share {
    fn from(entries: Vec<Share>) -> GQLSet_Share { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Share> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Share;
#[Subscription]
impl SubscriptionShard_Share {
    async fn shares<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Share, SubError>> + 'a {
        handle_generic_gql_collection_request::<Share, GQLSet_Share>(ctx, "shares", filter).await
    }
    async fn share<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Share>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Share>(ctx, "shares", id).await
    }
}

}
use rust_shared::{SubError, serde, serde_json, async_graphql};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::{wrap_slow_macros, wrap_serde_macros, Deserialize_Stub, Serialize_Stub};
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};

use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::{QueryFilter, FilterInput}};

use super::_shared::access_policy_target::AccessPolicyTarget;

// for testing wrap_serde_macros! on a single struct
/*wrap_serde_macros!{
#[derive(Serialize, Deserialize)]
pub struct Test1 {}
}*/

#[derive(Serialize_Stub, Deserialize_Stub)]
pub struct Test1 {}

/*#[derive(Serialize, Deserialize)]
pub struct Test2 {}*/
/*impl serde::Serialize for Test2 {
    fn serialize<__S>(&self, __serializer: __S) -> serde::__private::Result<__S::Ok, __S::Error> where __S: serde::Serializer {
        Err(serde::ser::Error::custom("This is a placeholder generated by the Serialize_Stub macro, for quick resolution during cargo-check. You should not be seeing this."))
    }
}
impl <'de> serde::Deserialize<'de> for Test2 {
    fn deserialize<__D>(__deserializer:__D) -> serde::__private::Result<Self, __D::Error> where __D: serde::Deserializer<'de> {
        Err(serde::de::Error::custom("This is a placeholder generated by the Deserialize_Stub macro, for quick resolution during cargo-check. You should not be seeing this."))
    }
}*/

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct CommandRun {
    pub id: ID,
    pub actor: String,
	pub runTime: i64,
    #[graphql(name = "public_base")]
    pub public_base: bool,
    pub commandName: String,
    pub commandPayload: serde_json::Value,
    pub returnData: serde_json::Value,
    pub rlsTargets: serde_json::Value,
    #[graphql(name = "c_accessPolicyTargets")]
    pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
impl From<Row> for CommandRun {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Clone)] pub struct GQLSet_CommandRun { nodes: Vec<CommandRun> }
#[Object] impl GQLSet_CommandRun { async fn nodes(&self) -> &Vec<CommandRun> { &self.nodes } }
impl GQLSet<CommandRun> for GQLSet_CommandRun {
    fn from(entries: Vec<CommandRun>) -> GQLSet_CommandRun { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<CommandRun> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_CommandRun;
#[Subscription]
impl SubscriptionShard_CommandRun {
    async fn commandRuns<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_CommandRun, SubError>> + 'a {
        handle_generic_gql_collection_request::<CommandRun, GQLSet_CommandRun>(ctx, "commandRuns", filter).await
    }
    async fn commandRun<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<CommandRun>, SubError>> + 'a {
        handle_generic_gql_doc_request::<CommandRun>(ctx, "commandRuns", id).await
    }
}

}
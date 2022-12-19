use deadpool_postgres::tokio_postgres::Row;
use indexmap::IndexMap;
use rust_shared::serde_json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow::Error, rust_macros::wrap_slow_macros};
use rust_shared::async_graphql::{self, ID, Enum, SimpleObject, InputObject};
use serde::{Serialize, Deserialize};

use crate::db::commands::_command::{FieldUpdate_Nullable, FieldUpdate};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::{db::node_child_links::{get_node_child_links, ClaimForm, get_link_under_parent}, utils::db::accessors::AccessorContext};

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum NodeType {
	#[graphql(name = "category")] category,
	#[graphql(name = "package")] package,
	#[graphql(name = "multiChoiceQuestion")] multiChoiceQuestion,
	#[graphql(name = "claim")] claim,
	#[graphql(name = "argument")] argument,
}

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum ArgumentType {
	#[graphql(name = "any")] any,
	#[graphql(name = "anyTwo")] anyTwo,
	#[graphql(name = "all")] all,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Node {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub accessPolicy: String,
	pub r#type: NodeType,
	pub rootNodeForMap: Option<String>,
	#[graphql(name = "c_currentRevision")]
	//pub c_currentRevision: Option<String>,
	pub c_currentRevision: String,
	pub multiPremiseArgument: Option<bool>, // todo: probably make this non-nullable
	pub argumentType: Option<ArgumentType>,
	pub extras: JSONValue,
	//pub extras: Node_Extras,
}
impl Node {
	pub fn extras_known(&self) -> Result<Node_Extras, Error> {
		Ok(serde_json::from_value(self.extras.clone())?)
	}
}
impl From<Row> for Node {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

/*#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct NodeInput {
}*/

#[derive(InputObject, Deserialize)]
pub struct NodeUpdates {
	pub accessPolicy: FieldUpdate<String>,
	//pub multiPremiseArgument: FieldUpdate_Nullable<bool>, // excluded, since updating this field has external side-effects that would be unexpected in a generic update_x command
	pub argumentType: FieldUpdate_Nullable<ArgumentType>,
	pub extras: FieldUpdate<JSONValue>,
}

#[derive(/*SimpleObject, InputObject,*/ Clone, Serialize, Deserialize)]
/*#[graphql(input_name = "NodeExtrasInput")]
//#[graphql(name = "Node_Extras", input_name = "Node_ExtrasInput")] # todo: use this approach once async-graphql is updated*/
pub struct Node_Extras {
	pub ratingSummaries: Option<IndexMap<String, RatingSummary>>,
}

#[derive(/*SimpleObject, InputObject,*/ Clone, Serialize, Deserialize)]
//#[graphql(input_name = "RatingSummaryInput")]
pub struct RatingSummary {
	pub average: Option<f64>,
	pub countsByRange: Vec<i64>,
}

}

pub async fn get_node_form(ctx: &AccessorContext<'_>, node_id: &str, parent_id: &str) -> Result<ClaimForm, Error> {
	let link = get_link_under_parent(ctx, &node_id, &parent_id).await?;
	Ok(link.form.unwrap_or(ClaimForm::base))
}
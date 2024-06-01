use deadpool_postgres::tokio_postgres::Row;
use rust_shared::async_graphql::{self, Enum, InputObject, SimpleObject, ID};
use rust_shared::indexmap::IndexMap;
use rust_shared::serde_json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow::Error, rust_macros::wrap_slow_macros};
use serde::{Deserialize, Serialize};

use crate::db::commands::_command::{CanNullOrOmit, CanOmit};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::{
	db::node_links::{get_first_link_under_parent, get_node_links, ClaimForm},
	utils::db::accessors::AccessorContext,
};

use super::_node_type::NodeType;

wrap_slow_macros! {

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum ArgumentType {
	#[graphql(name = "any")] any,
	#[graphql(name = "anyTwo")] anyTwo,
	#[graphql(name = "all")] all,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Node_Extras {
	pub ratingSummaries: Option<IndexMap<String, RatingSummary>>,

	// namespaces/patterns used/expected atm: "claimgen:<uuid, full-form>"
	// commented; new approach is to use extras.TOOL_NAMESPACE.id
	//pub externalId: Option<String>,
}
pub fn node_extras_locked_subfields() -> Vec<&'static str> { vec!["ratingSummaries"] }

#[derive(/*SimpleObject, InputObject,*/ Clone, Serialize, Deserialize)]
//#[graphql(input_name = "RatingSummaryInput")]
pub struct RatingSummary {
	pub average: Option<f64>,
	pub countsByRange: Vec<i64>,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Node {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub accessPolicy: String,
	pub r#type: NodeType,
	pub rootNodeForMap: Option<String>,
	pub multiPremiseArgument: Option<bool>, // todo: probably make this non-nullable
	pub argumentType: Option<ArgumentType>,
	pub extras: JSONValue,
	//pub extras: Node_Extras,

	#[graphql(name = "c_currentRevision")]
	//pub c_currentRevision: Option<String>,
	pub c_currentRevision: String,
}
impl Node {
	pub fn extras_known(&self) -> Result<Node_Extras, Error> {
		Ok(serde_json::from_value(self.extras.clone())?)
	}
	pub fn into_input(self, try_keep_extras: bool) -> NodeInput {
		let extras = match try_keep_extras {
			false => None,
			true => match self.extras {
				JSONValue::Object(map) => {
					let mut map = map;
					map.remove("ratingSummaries"); // this subfield is protected / can't be set in addChildNode command
					Some(serde_json::Value::Object(map))
				}
				_ => None,
			},
		};
		NodeInput {
			accessPolicy: self.accessPolicy,
			r#type: self.r#type,
			rootNodeForMap: self.rootNodeForMap,
			multiPremiseArgument: self.multiPremiseArgument,
			argumentType: self.argumentType,
			extras,
		}
	}
}
impl From<Row> for Node {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct NodeInput {
	pub accessPolicy: String,
	pub r#type: NodeType,
	pub rootNodeForMap: Option<String>,
	pub multiPremiseArgument: Option<bool>,
	pub argumentType: Option<ArgumentType>,
	pub extras: CanOmit<JSONValue>,
}

#[derive(InputObject, Serialize, Deserialize, Clone)]
pub struct NodeUpdates {
	pub accessPolicy: CanOmit<String>,
	//pub multiPremiseArgument: CanNullOrOmit<bool>, // excluded, since updating this field has external side-effects that would be unexpected in a generic update_x command
	pub argumentType: CanNullOrOmit<ArgumentType>,
	pub extras: CanOmit<JSONValue>,
}

}

pub async fn get_node_form(ctx: &AccessorContext<'_>, node_id: &str, parent_id: &str) -> Result<ClaimForm, Error> {
	let link = get_first_link_under_parent(ctx, &node_id, &parent_id).await?;
	Ok(link.form.unwrap_or(ClaimForm::base))
}

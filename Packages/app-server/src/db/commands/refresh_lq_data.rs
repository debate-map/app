use deadpool_postgres::Pool;
use jsonschema::{output::BasicOutput, JSONSchema};
use lazy_static::lazy_static;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, serde, serde_json};

use crate::store::storage::{get_app_state_from_gql_ctx, AppStateArc};
use crate::{
	db::{_general::GenericMutation_Result, nodes::get_node},
	store::live_queries::LQStorageArc,
};

#[derive(Serialize, Deserialize, Debug)] //#[serde(crate = "rust_shared::serde")]
pub struct RefreshLQDataPayload {
	collection: String,
	entryID: String,
}
lazy_static! {
	static ref REFRESH_LQ_DATA_PAYLOAD_SCHEMA_JSON: JSONValue = json!({
		"properties": {
			"collection": {"type": "string"},
			"entryID": {"type": "string"},
		},
		"required": ["collection", "entryID"],
	});
	static ref REFRESH_LQ_DATA_PAYLOAD_SCHEMA_JSON_COMPILED: JSONSchema = JSONSchema::compile(&REFRESH_LQ_DATA_PAYLOAD_SCHEMA_JSON).expect("A valid schema");
}

pub async fn refresh_lq_data(ctx: &async_graphql::Context<'_>, payload_raw: JSONValue) -> Result<GenericMutation_Result, Error> {
	let output: BasicOutput = REFRESH_LQ_DATA_PAYLOAD_SCHEMA_JSON_COMPILED.apply(&payload_raw).basic();
	if !output.is_valid() {
		let output_json = serde_json::to_value(output).expect("Failed to serialize output");
		return Err(anyhow!(output_json));
	}
	let payload: RefreshLQDataPayload = serde_json::from_value(payload_raw)?;
	/*let filter = json!({
		"id": {"equalTo": payload.entryID}
	});*/

	let lq_storage = {
		let ctx2 = ctx; // move ctx, so we know this block is the last usage of it
		let app_state = get_app_state_from_gql_ctx(ctx2);
		app_state.live_queries.clone()
	};

	lq_storage.refresh_lq_data(payload.collection, payload.entryID).await?;

	Ok(GenericMutation_Result { message: "Command completed successfully.".to_owned() })
}

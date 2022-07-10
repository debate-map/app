use anyhow::{anyhow, Error};
use jsonschema::{JSONSchema, output::BasicOutput};
use serde::{Serialize, Deserialize};
use serde_json::json;
use lazy_static::lazy_static;
use deadpool_postgres::Pool;

use crate::{utils::type_aliases::JSONValue, db::{_general::GenericMutation_Result, nodes::get_node}, store::live_queries::LQStorageWrapper};

#[derive(Serialize, Deserialize, Debug)]
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

    let (client, storage) = {
        let ctx2 = ctx; // move ctx, so we know this block is the last usage of it
        let pool = ctx2.data::<Pool>().unwrap();
        let client = pool.get().await.unwrap();
        let storage = ctx2.data::<LQStorageWrapper>().unwrap().clone();
        (client, storage)
    };

    storage.refresh_lq_data(payload.collection, payload.entryID, &client).await?;
    
    Ok(GenericMutation_Result {
        message: "Command completed successfully.".to_owned(),
    })
}
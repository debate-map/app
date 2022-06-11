use anyhow::{anyhow, Error};
use jsonschema::{JSONSchema, output::BasicOutput};
use serde_json::json;

use crate::{utils::type_aliases::JSONValue, db::_general::GenericMutation_Result};

// todo: expand this from just node-cloning, to also work for node moving/linking (as intended)
pub fn transfer_nodes(payload: JSONValue) -> Result<GenericMutation_Result, Error> {
    let schema = json!({
        "properties": {
            "nodes": {
                "items": {
                    "properties": {
                        "nodeID": {"type": "string"},
                        "transferType": {"type": "string"},
                        "clone_newType": {"type": "string"},

                        "newParentID": {"type": "string"},
                        "childGroup": {"type": "string"},
                    },
                },
            },
        },
        //"required": ["newParentID", "nodeID", "childGroup"],
    });
    let compiled = JSONSchema::compile(&schema).expect("A valid schema");

    let output: BasicOutput = compiled.apply(&payload).basic();

    if !output.is_valid() {
        let output_json = serde_json::to_value(output).expect("Failed to serialize output");
        return Err(anyhow!(output_json));
    }

    // todo

    Ok(GenericMutation_Result {
        message: "Command completed successfully.".to_owned(),
    })
}
use anyhow::{anyhow, Error};
use jsonschema::{JSONSchema, output::BasicOutput};
use serde::{Serialize, Deserialize};
use serde_json::json;
use lazy_static::lazy_static;

use crate::{utils::type_aliases::JSONValue, db::_general::GenericMutation_Result};

// temp
type TransferType = String;
type MapNodeType = String;
type ClaimForm = String;
type Polarity = String;
type ChildGroup = String;

#[derive(Serialize, Deserialize, Debug)]
pub struct TransferNodesPayload {
	nodes: Vec<NodeInfoForTransfer>,
}
lazy_static! {
    static ref TRANSFER_NODES_PAYLOAD_SCHEMA_JSON: JSONValue = json!({
        "properties": {
            "nodes": {
                "items": {
                    "properties": {
                        "nodeID": {"type": "string"},
                        "transferType": {"type": "string"},
                        "clone_newType": {"type": "string"},
                        "clone_keepChildren": {"type": "boolean"},

                        "newParentID": {"type": "string"},
                        "childGroup": {"type": "string"},
                        "claimForm": {"type": "string"},
                        "argumentPolarity": {"type": "string"},
                    },
                    "required": [
                        "transferType",
                        //"clone_newType", "clone_keepChildren",
                        "childGroup",
                    ],
                },
            },
        },
        "required": ["nodes"],
    });
    static ref TRANSFER_NODES_PAYLOAD_SCHEMA_JSON_COMPILED: JSONSchema = JSONSchema::compile(&TRANSFER_NODES_PAYLOAD_SCHEMA_JSON).expect("A valid schema");
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NodeInfoForTransfer {
	nodeID: Option<String>,
	oldParentID: Option<String>,
	transferType: TransferType,
	clone_newType: MapNodeType,
	clone_keepChildren: bool,

	newParentID: Option<String>,
	childGroup: ChildGroup,
	claimForm: Option<ClaimForm>,
	argumentPolarity: Option<Polarity>,
}

// todo: expand this from just node-cloning, to also work for node moving/linking (as intended)
pub fn transfer_nodes(payload_raw: JSONValue) -> Result<GenericMutation_Result, Error> {
    let output: BasicOutput = TRANSFER_NODES_PAYLOAD_SCHEMA_JSON_COMPILED.apply(&payload_raw).basic();
    if !output.is_valid() {
        let output_json = serde_json::to_value(output).expect("Failed to serialize output");
        return Err(anyhow!(output_json));
    }
    let payload: TransferNodesPayload = serde_json::from_value(payload_raw)?; 

    for node in payload.nodes {
        if node.transferType == "clone" {
            println!("Found clone transfer:{node:?}");
        }
    }

    Ok(GenericMutation_Result {
        message: "Command completed successfully.".to_owned(),
    })
}
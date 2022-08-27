use rust_shared::anyhow::{anyhow, Error};
use jsonschema::{JSONSchema, output::BasicOutput};
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use lazy_static::lazy_static;
use deadpool_postgres::Pool;

use crate::{utils::type_aliases::JSONValue, db::{_general::GenericMutation_Result, nodes::get_node, general::accessor_helpers::AccessorContext}};

// temp
type TransferType = String;
type MapNodeType = String;
type ClaimForm = String;
type Polarity = String;
type ChildGroup = String;
type NodeTagCloneType = String;

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
                        "clone_keepTags": {"type": "boolean"},

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
	nodeID: Option<String>, // can be null, if transfer is of type "shim"
	oldParentID: Option<String>,
	transferType: TransferType,
	clone_newType: MapNodeType,
	clone_keepChildren: bool,
	clone_keepTags: NodeTagCloneType,

	newParentID: Option<String>,
	childGroup: ChildGroup,
	claimForm: Option<ClaimForm>,
	argumentPolarity: Option<Polarity>,
}

// todo: expand this from just node-cloning, to also work for node moving/linking (as intended)
pub async fn transfer_nodes(gql_ctx: &async_graphql::Context<'_>, payload_raw: JSONValue) -> Result<GenericMutation_Result, Error> {
    let output: BasicOutput = TRANSFER_NODES_PAYLOAD_SCHEMA_JSON_COMPILED.apply(&payload_raw).basic();
    if !output.is_valid() {
        let output_json = serde_json::to_value(output).expect("Failed to serialize output");
        return Err(anyhow!(output_json));
    }
    let payload: TransferNodesPayload = serde_json::from_value(payload_raw)?;

    let mut anchor = DataAnchorFor1::empty(); // holds pg-client
    let tx = start_transaction(&mut anchor, gql_ctx).await?;
    let ctx = AccessorContext::new(tx);

    for (i, node_info) in payload.nodes.iter().enumerate() {
        let _prev_node_info = payload.nodes.get(i - 1);
        match node_info.transferType.as_str() {
            "ignore" => {},
            "move" => {
                return Err(anyhow!("Not yet implemented."));
                // todo
            },
            "link" => {
                return Err(anyhow!("Not yet implemented."));
                // todo
            },
            "clone" => {
                //println!("Found clone transfer:{node:?}");
                let node_id = node_info.nodeID.as_ref().ok_or(anyhow!("For transfer of type \"clone\", nodeID must be specified."))?;
                let node = get_node(&ctx, node_id).await?;
            },
            "shim" => {
                return Err(anyhow!("Not yet implemented."));
                // todo
            },
            transfer_type => {
                return Err(anyhow!("Invalid transfer type \"{transfer_type}\"."));
            },
        }
    }

    Ok(GenericMutation_Result {
        message: "Command completed successfully.".to_owned(),
    })
}
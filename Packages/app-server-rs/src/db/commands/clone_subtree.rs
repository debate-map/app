use jsonschema::JSONSchema;
use jsonschema::output::BasicOutput;
use lazy_static::lazy_static;
use anyhow::{anyhow, Context, Error};
use async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use deadpool_postgres::{Pool, Client, Transaction};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future, TryStreamExt};
use hyper::{Body, Method};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio::sync::RwLock;
use tokio_postgres::Row;
use tokio_postgres::types::ToSql;
use tracing::info;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::db::_general::GenericMutation_Result;
use crate::db::access_policies::AccessPolicy;
use crate::db::general::subtree::get_subtree;
use crate::db::medias::Media;
use crate::db::node_child_links::NodeChildLink;
use crate::db::node_phrasings::MapNodePhrasing;
use crate::db::node_revisions::MapNodeRevision;
use crate::db::node_tags::MapNodeTag;
use crate::db::nodes::MapNode;
use crate::db::terms::Term;
use crate::links::proxy_to_asjs::{HyperClient, APP_SERVER_JS_URL};
use crate::utils::db::accessors::AccessorContext;
use crate::utils::db::filter::{QueryFilter, FilterInput};
use crate::utils::db::pg_stream_parsing::RowData;
use crate::utils::db::sql_fragment::SQLFragment;
use crate::utils::db::sql_param::SQLIdent;
use crate::utils::db::transactions::start_transaction;
use crate::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1, DataAnchor};
use crate::utils::general::general::to_anyhow;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}}};
use crate::utils::type_aliases::{JSONValue, PGClientObject};

use super::_command::set_db_entry_by_id;

//wrap_slow_macros!{}

#[derive(Serialize, Deserialize, Debug)]
pub struct CloneSubtreePayload {
    rootNodeID: String,
    maxDepth: Option<usize>,
}
lazy_static! {
    static ref CLONE_SUBTREE_PAYLOAD_SCHEMA_JSON: JSONValue = json!({
        "properties": {
            "rootNodeID": {"type": "string"},
            "maxDepth": {"type": "number"},
        },
        "required": ["rootNodeID", "maxDepth"],
    });
    static ref CLONE_SUBTREE_PAYLOAD_SCHEMA_JSON_COMPILED: JSONSchema = JSONSchema::compile(&CLONE_SUBTREE_PAYLOAD_SCHEMA_JSON).expect("A valid schema");
}

pub async fn clone_subtree(gql_ctx: &async_graphql::Context<'_>, payload_raw: JSONValue) -> Result<GenericMutation_Result, Error> {
    let output: BasicOutput = CLONE_SUBTREE_PAYLOAD_SCHEMA_JSON_COMPILED.apply(&payload_raw).basic();
    if !output.is_valid() {
        let output_json = serde_json::to_value(output).expect("Failed to serialize output");
        return Err(anyhow!(output_json));
    }
    let payload: CloneSubtreePayload = serde_json::from_value(payload_raw)?;
    
    let mut anchor = DataAnchorFor1::empty(); // holds pg-client
    let tx = start_transaction(&mut anchor, gql_ctx).await?;
    let ctx = AccessorContext::new(tx);

    let subtree = get_subtree(&ctx, payload.rootNodeID, payload.maxDepth).await?;
    // these don't need cloning (since they don't "reference back"): terms, medias

    // probably temp: helper for logging
    let log = |text: &str| {
        info!("MigrateLog: {text}");
        //msg_sender.send(GeneralMessage::MigrateLogMessageAdded(text.to_owned())).unwrap();
    };

    for node_old in subtree.nodes {
        let mut node = node_old.clone();
        node.id = ID(new_uuid_v4_as_b64());
        set_db_entry_by_id(&ctx, "nodes".to_owned(), node.id.to_string(), to_row_data(node)?).await?;
    }
    for rev_old in subtree.nodeRevisions {
        let mut rev = rev_old.clone();
        rev.id = ID(new_uuid_v4_as_b64());
        set_db_entry_by_id(&ctx, "nodeRevisions".to_owned(), rev.id.to_string(), to_row_data(rev)?).await?;
    }
    for phrasing_old in subtree.nodePhrasings {
        let mut phrasing = phrasing_old.clone();
        phrasing.id = ID(new_uuid_v4_as_b64());
        set_db_entry_by_id(&ctx, "nodePhrasings".to_owned(), phrasing.id.to_string(), to_row_data(phrasing)?).await?;
    }
    for link_old in subtree.nodeChildLinks {
        let mut link = link_old.clone();
        link.id = ID(new_uuid_v4_as_b64());
        set_db_entry_by_id(&ctx, "nodeChildLinks".to_owned(), link.id.to_string(), to_row_data(link)?).await?;
    }
    for tag_old in subtree.nodeTags {
        let mut tag = tag_old.clone();
        tag.id = ID(new_uuid_v4_as_b64());
        set_db_entry_by_id(&ctx, "tags".to_owned(), tag.id.to_string(), to_row_data(tag)?).await?;
    }

    log("Committing transaction...");
    ctx.tx.commit().await?;
    log("Clone-subtree command complete!");
    Ok(GenericMutation_Result {
        message: "Command completed successfully.".to_owned(),
    })
}

fn to_row_data(data: impl Serialize) -> Result<RowData, Error> {
    let as_json = serde_json::to_value(data)?;
    let as_map = as_json.as_object().ok_or(anyhow!("The passed data did not serialize to a json map!"))?;
    Ok(as_map.to_owned())
}
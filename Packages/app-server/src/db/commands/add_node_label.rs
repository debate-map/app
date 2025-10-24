use crate::db::general::subtree_collector::params;
use crate::db::nodes::get_node;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::db::users::User;
use super::_command::{insert_db_entry_by_id_for_struct, NoExtras};
use futures_util::TryStreamExt;
use rust_shared::anyhow::bail;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID, Object};
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::tokio_postgres::Row;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError, anyhow::Error};
use crate::db::commands::_command::command_boilerplate;

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddNodeLabelInput {
    pub label: String,
    pub node_id: String,
}

#[derive(SimpleObject, Debug)]
pub struct AddNodeLabelResult {
    /// Whether a new label was actually added (true) or if the label already existed on that node (false)
    pub inserted: bool,
}

#[derive(Default)]
pub struct MutationShard_AddNodeLabel;

#[Object]
impl MutationShard_AddNodeLabel {
	async fn add_node_label(&self, gql_ctx: &async_graphql::Context<'_>, input: AddNodeLabelInput, only_validate: Option<bool>) -> Result<AddNodeLabelResult, GQLError> {
        command_boilerplate!(gql_ctx, input, only_validate, add_node_label);
	}
}

pub async fn add_node_label(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddNodeLabelInput, _extras: NoExtras) -> Result<AddNodeLabelResult, Error> {
    let AddNodeLabelInput { label, node_id} = input;
    let inserted : bool = {
         let query = r#"
            WITH n AS (
                SELECT 1 FROM app."nodes" WHERE "id" = $1 FOR SHARE
            ),
            ins AS (
                INSERT INTO app."nodeLabels" ("nodeId","label","createdAt","creator")
                SELECT $1, $2, $3, $4
                FROM n
                ON CONFLICT ("nodeId","label","creator") DO NOTHING
                RETURNING 1
            )
            SELECT EXISTS(SELECT 1 FROM ins) AS "inserted"
            FROM n
        "#;

        let rows: Vec<Row> = ctx.tx.query_raw(query, params(&[&node_id, &label, &time_since_epoch_ms_i64(), &actor.id.to_string()])).await?.try_collect().await?;
        match rows.len() {
            0 => bail!("Node with ID {node_id} does not exist"),
            1 => rows[0].try_get("inserted")?,
            _ => bail!("Unexpectedly got multiple rows when trying to add node label '{label}'"),
        }
    };

    Ok(AddNodeLabelResult { inserted })
}

use futures_util::TryStreamExt;
use rust_shared::anyhow::{bail, ensure};
use rust_shared::async_graphql::{InputObject, SimpleObject, ID, Object};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::tokio_postgres::Row;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use serde::Serialize;
use crate::db::commands::_command::{command_boilerplate, gql_placeholder};
use crate::db::general::permission_helpers::{assert_user_can_delete, is_user_admin};
use crate::db::general::subtree_collector::params;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use super::_command::{NoExtras};

wrap_slow_macros! {

#[derive(InputObject, Serialize)]
pub struct DeleteNodeLabelInput {
    pub node_id: String,
    pub label: String,
    /// Whether to delete the label for all creators for the given node
    pub for_all_creators: bool,
}

#[derive(Default)] pub struct MutationShard_DeleteNodeLabel;
#[Object] impl MutationShard_DeleteNodeLabel {
    async fn delete_node_label(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteNodeLabelInput, only_validate: Option<bool>) -> Result<DeleteNodeLabelResult, GQLError> {
        command_boilerplate!(gql_ctx, input, only_validate, delete_node_label);
    }
}

#[derive(SimpleObject, Debug)]
pub struct DeleteNodeLabelResult {
    /// Whether at least one creator still has this label on this node(on which the label was deleted)
    pub still_creator_left: bool,
}

}

pub async fn delete_node_label(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: DeleteNodeLabelInput, _extras: NoExtras) -> anyhow::Result<DeleteNodeLabelResult> {
    let DeleteNodeLabelInput { node_id, label, for_all_creators } = input;

    if for_all_creators {
	    ensure!(is_user_admin(actor), "Only admins can delete labels for all creators in a node");
        let query_all = r#"
            WITH del AS (
              DELETE FROM app."nodeLabels"
              WHERE "nodeId" = $1 AND "label" = $2
              RETURNING 1
            )
            SELECT
              EXISTS(SELECT 1 FROM del) AS deleted_any,
              EXISTS(
                SELECT 1 FROM app."nodeLabels"
                WHERE "nodeId" = $1 AND "label" = $2
              ) AS still_creator_left;
        "#;

        let rows: Vec<Row> = ctx.tx
            .query_raw(query_all, params(&[&node_id, &label]))
            .await?
            .try_collect()
            .await?;

        let deleted_any: bool = rows[0].try_get("deleted_any")?;
        let still_creator_left: bool = rows[0].try_get("still_creator_left")?;

        if !deleted_any {
            bail!("Node {node_id} has no label '{label}' to delete (nothing removed)")
        }

        return Ok(DeleteNodeLabelResult { still_creator_left });

    }else {
        let query = r#"
            WITH del AS (
              DELETE FROM app."nodeLabels"
              WHERE "nodeId" = $1 AND "label" = $2 AND "creator" = $3
              RETURNING 1
            )
            SELECT
              EXISTS(SELECT 1 FROM del) AS deleted_self,
              EXISTS(
                SELECT 1
                FROM app."nodeLabels"
                WHERE "nodeId" = $1 AND "label" = $2 AND "creator" <> $3
              ) AS still_creator_left;
        "#;

        let rows: Vec<Row> = ctx.tx
            .query_raw(query, params(&[&node_id, &label, &actor.id.to_string()]))
            .await?
            .try_collect()
            .await?;

        let deleted_self: bool = rows[0].try_get("deleted_self")?;
        let still_creator_left: bool = rows[0].try_get("still_creator_left")?;

        if !deleted_self {
            bail!("Node with ID {node_id} does not exist or label not found for this creator");
        }

        Ok(DeleteNodeLabelResult { still_creator_left })
    }
}

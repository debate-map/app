use futures_util::TryStreamExt;
use rust_shared::anyhow::bail;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID, Object};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::tokio_postgres::Row;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use serde::Serialize;
use crate::db::commands::_command::{command_boilerplate, gql_placeholder};
use crate::db::general::permission_helpers::assert_user_can_delete;
use crate::db::general::subtree_collector::params;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use super::_command::{NoExtras};

wrap_slow_macros! {

#[derive(InputObject, Serialize)]
pub struct DeleteNodeLabelInput {
    pub node_id: String,
    pub label: String,
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
    let DeleteNodeLabelInput { node_id, label } = input;

    let query = r#"
        WITH del AS (
          DELETE FROM app."nodeToLabel"
          WHERE "nodeId" = $1 AND "label" = $2 AND "creator" = $3 -- ::uuid if needed
          RETURNING 1
        ),
        remaining AS (
          SELECT EXISTS(
            SELECT 1 FROM app."nodeToLabel"
            WHERE "nodeId" = $1 AND "label" = $2
          ) AS still_creator_left
        )
        SELECT EXISTS(SELECT 1 FROM del) AS deleted_self, r.still_creator_left
        FROM remaining r;
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

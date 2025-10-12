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
    #[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn delete_node_label(ctx: &AccessorContext<'_>, _actor: &User, _is_root: bool, input: DeleteNodeLabelInput, _extras: NoExtras) -> anyhow::Result<DeleteNodeLabelResult> {
    let DeleteNodeLabelInput { node_id, label } = input;
    let query = r#"
        WITH n AS (
            SELECT 1
            FROM app."nodes"
            WHERE "id" = $1
            FOR KEY SHARE
        ),
        del AS (
            DELETE FROM app."nodeToLabel" t
            USING n
            WHERE t."nodeId" = $1 AND t."label" = $2
            RETURNING 1
        )
        SELECT EXISTS(SELECT 1 FROM del) AS "deleted"
        FROM n
    "#;

    let rows: Vec<Row> = ctx.tx
        .query_raw(query, params(&[&node_id, &label]))
        .await?
        .try_collect()
        .await?;

    match rows.len() {
        0 => bail!("Node with ID {node_id} does not exist"),
        1 => Ok(DeleteNodeLabelResult { __: gql_placeholder() }),
        _ => bail!("Unexpectedly got multiple rows when trying to delete node label '{label}'"),
    }
}

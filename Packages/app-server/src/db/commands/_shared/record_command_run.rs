use rust_shared::{anyhow::{Error, anyhow}, utils::{general_::extensions::ToOwnedV, type_aliases::JSONValue, time::time_since_epoch_ms_i64, db::uuid::new_uuid_v4_as_b64}, itertools::Itertools, async_graphql::ID};
use tracing::error;

use crate::{utils::{db::{accessors::AccessorContext, queries::get_entries_in_collection, filter::QueryFilter}, general::data_anchor::DataAnchorFor1}, db::{maps::{get_map, Map}, commands::_command::set_db_entry_by_id_for_struct, user_hiddens::get_user_hidden, users::User, command_runs::CommandRun}};

pub async fn record_command_run_if_root(
    ctx: &AccessorContext<'_>, actor: &User, is_root: bool,
    command_name: String, command_input: JSONValue, command_result: JSONValue,
    involved_nodes: Vec<String>,
) -> Result<(), Error> {
    if !is_root { return Ok(()); }
    record_command_run(ctx, actor, command_name, command_input, command_result, involved_nodes).await
}

pub async fn record_command_run(
    ctx: &AccessorContext<'_>, actor: &User,
    command_name: String, command_input: JSONValue, command_result: JSONValue,
    involved_nodes: Vec<String>,
) -> Result<(), Error> {
    let actor_hidden = get_user_hidden(ctx, actor.id.as_str()).await?;
    let make_public_base = actor_hidden.addToStream;

    ctx.with_rls_disabled(|| async {
        trim_old_command_runs(ctx).await
    }, Some("Failed to perform trimming of old command-runs.")).await?;

    let id = new_uuid_v4_as_b64();
    let command_run = CommandRun {
        // set by this func
        id: ID(id),
        actor: actor.id.to_string(),
        runTime: time_since_epoch_ms_i64(),
        public_base: make_public_base,
        // pass-through
        commandName: command_name,
        commandInput: command_input,
        commandResult: command_result,
        c_involvedNodes: involved_nodes,
        c_accessPolicyTargets: vec![], // auto-set by db
    };
    set_db_entry_by_id_for_struct(&ctx, "commandRuns".to_owned(), command_run.id.to_string(), command_run).await?;

    Ok(())
}

/// Helper function to keep command-runs collection from growing beyond X entries. (this implementation isn't great, but better than nothing for now)
async fn trim_old_command_runs(ctx: &AccessorContext<'_>) -> Result<(), Error> {
    // this is an alternative way to have an admin-access transaction temporarily (commented since more complex)
    /*let gql_ctx = ctx.gql_ctx.unwrap();
    let mut anchor = DataAnchorFor1::empty(); // holds pg-client
    let ctx_admin = AccessorContext::new_write(&mut anchor, gql_ctx, false).await?;*/

    let (_, command_runs) = get_entries_in_collection::<CommandRun>(ctx, "commandRuns".o(), &QueryFilter::empty(), None).await?;
    let command_runs_to_remove = command_runs.into_iter()
        .filter(|commandRun| {
            // keep the most recent 100 entries
            if commandRun.runTime > 100 { return false; }

            // keep entries created in the last 3 days
            let timeSinceRun = time_since_epoch_ms_i64() - commandRun.runTime;
            if timeSinceRun < 3 * 24 * 60 * 60 * 1000 { return false; }

            // delete the rest
            return true;
        })
        // for now, limit command-runs-to-remove to 10 entries (else server can be overwhelmed and crash; exact diagnosis unknown, but happened for case of 227-at-once)
        .take(10)
        .collect_vec();
    
    let command_run_ids_to_remove = command_runs_to_remove.iter().map(|commandRun| commandRun.id.to_string()).collect_vec();
    ctx.tx.execute(r#"DELETE FROM "commandRuns" WHERE id = ANY($1)"#, &[&command_run_ids_to_remove]).await?;
    Ok(())
}
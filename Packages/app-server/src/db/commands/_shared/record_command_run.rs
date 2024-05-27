use rust_shared::{
    anyhow::{anyhow, Error},
    async_graphql::ID,
    itertools::Itertools,
    serde_json::json,
    utils::{
        db::uuid::new_uuid_v4_as_b64, general_::extensions::ToOwnedV,
        time::time_since_epoch_ms_i64, type_aliases::JSONValue,
    },
};
use tracing::error;

use crate::{
    db::{
        command_runs::CommandRun,
        commands::{
            _command::upsert_db_entry_by_id_for_struct,
            add_notification::{self, add_notification, AddNotificationInput},
        },
        maps::{get_map, Map},
        subscriptions::Subscription,
        user_hiddens::get_user_hidden,
        users::User,
    },
    utils::{
        db::{
            accessors::{get_db_entry, AccessorContext},
            filter::QueryFilter,
            queries::get_entries_in_collection,
        },
        general::data_anchor::DataAnchorFor1,
    },
};

pub async fn record_command_run_if_root(
    ctx: &AccessorContext<'_>,
    actor: &User,
    is_root: bool,
    command_name: String,
    command_input: JSONValue,
    command_result: JSONValue,
    involved_nodes: Vec<String>,
) -> Result<(), Error> {
    if !is_root {
        return Ok(());
    }
    record_command_run(
        ctx,
        actor,
        command_name,
        command_input,
        command_result,
        involved_nodes,
    )
    .await
}

pub async fn record_command_run(
    ctx: &AccessorContext<'_>,
    actor: &User,
    command_name: String,
    command_input: JSONValue,
    command_result: JSONValue,
    involved_nodes: Vec<String>,
) -> Result<(), Error> {
    let actor_hidden = get_user_hidden(ctx, actor.id.as_str()).await?;
    let make_public_base = actor_hidden.addToStream;

    ctx.with_rls_disabled(
        || async { trim_old_command_runs(ctx).await },
        Some("Failed to perform trimming of old command-runs."),
    )
    .await?;

    let id = new_uuid_v4_as_b64();

    let command_run = CommandRun {
        // set by this func
        id: ID(id.clone()),
        actor: actor.id.to_string(),
        runTime: time_since_epoch_ms_i64(),
        public_base: make_public_base,
        // pass-through
        commandName: command_name.clone(),
        commandInput: command_input,
        commandResult: command_result,
        c_involvedNodes: involved_nodes.clone(),
        c_accessPolicyTargets: vec![], // auto-set by db
    };

    upsert_db_entry_by_id_for_struct(
        &ctx,
        "commandRuns".to_owned(),
        command_run.id.to_string(),
        command_run,
    )
    .await?;

    for node in involved_nodes {
        let subscription = get_db_entry::<Subscription>(
            &ctx,
            "subscriptions",
            &Some(json!({
                "node": {"equalTo": node},
                "user": {"equalTo": actor.id.to_string()}
            })),
        )
        .await;

        if let Ok(subscription) = subscription {
            if (subscription.addChildNode && command_name == "addChildNode")
                || (subscription.addNodeLink && command_name == "addNodeLink")
                || (subscription.addNodeRevision && command_name == "addNodeRevision")
                || (subscription.deleteNode && command_name == "deleteNode")
                || (subscription.deleteNodeLink && command_name == "deleteNodeLink")
                || (subscription.setNodeRating && command_name == "setNodeRating")
            {
                add_notification(
                    ctx,
                    actor,
                    false,
                    AddNotificationInput {
                        commandRun: id.to_string(),
                        readTime: None,
                    },
                    false,
                )
                .await?;
            }
        };
    }

    Ok(())
}

/// Helper function to keep command-runs collection from growing beyond X entries. (this implementation isn't great, but better than nothing for now)
async fn trim_old_command_runs(ctx: &AccessorContext<'_>) -> Result<(), Error> {
    // this is an alternative way to have an admin-access transaction temporarily (commented since more complex)
    /*let gql_ctx = ctx.gql_ctx.unwrap();
    let mut anchor = DataAnchorFor1::empty(); // holds pg-client
    let ctx_admin = AccessorContext::new_write(&mut anchor, gql_ctx, false).await?;*/

    let (_, command_runs) = get_entries_in_collection::<CommandRun>(
        ctx,
        "commandRuns".o(),
        &QueryFilter::empty(),
        None,
    )
    .await?;
    let command_runs_to_remove = command_runs
        .into_iter()
        .enumerate()
        // sort by run-time, descending (so that latest ones are first)
        .sorted_by_cached_key(|a| -a.1.runTime)
        .filter(|(index, commandRun)| {
            // keep the most recent 100 entries
            if index < &100 {
                return false;
            }

            // keep entries created in the last 3 days (so long as the total count is less than 1000)
            let timeSinceRun = time_since_epoch_ms_i64() - commandRun.runTime;
            if timeSinceRun < 3 * 24 * 60 * 60 * 1000 && index < &1000 {
                return false;
            }

            // delete the rest
            return true;
        })
        // for now, limit command-runs-to-remove to the oldest 10 entries (else server can be overwhelmed and crash; exact diagnosis unknown, but happened for case of 227-at-once)
        .rev()
        .take(10)
        .collect_vec();

    let command_run_ids_to_remove = command_runs_to_remove
        .iter()
        .map(|commandRun| commandRun.1.id.to_string())
        .collect_vec();
    ctx.tx
        .execute(
            r#"DELETE FROM "commandRuns" WHERE id = ANY($1)"#,
            &[&command_run_ids_to_remove],
        )
        .await?;
    Ok(())
}

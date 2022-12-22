use futures_util::Future;
use rust_shared::utils::{type_aliases::JSONValue, general_::func_types::AsyncFn_Args3};
use rust_shared::anyhow::Error;

use crate::{db::{nodes::get_node, node_links::get_node_links}, utils::db::accessors::AccessorContext};

pub async fn search_up_from_node_for_node_matching_x(
    ctx: &AccessorContext<'_>,
    start_node_id: &str,
    //x_match_func: fn(&str, Option<&JSONValue>) -> bool,
    x_match_func: impl for<'a> AsyncFn_Args3<
        Result<bool, Error>,
        &'a AccessorContext<'a>,
        &'a str,
        Option<&'a JSONValue>
    >,
    x_match_func_data: Option<&JSONValue>,
    node_ids_to_ignore: Vec<String>
) -> Result<Option<String>, Error> {
    let start_node = get_node(ctx, start_node_id).await?;

    #[derive(Debug)]
    struct Head {
        id: String,
        path: Vec<String>,
    }
    let mut current_layer_heads: Vec<Head> = vec![Head { id: start_node.id.to_string(), path: vec![start_node.id.to_string()] }];
    while current_layer_heads.len() > 0 {
        // first, check if any current-layer-head nodes are the root-node (if so, return right away, as we found a shortest path)
        for layer_head in &current_layer_heads {
            if x_match_func(&ctx, &layer_head.id, x_match_func_data).await? {
                return Ok(Some(layer_head.path.join("/")));
            }
        }

        // else, find new-layer-heads for next search loop
        let mut new_layer_heads = vec![];
        for layer_head in &current_layer_heads {
            let node = get_node(ctx, &layer_head.id).await?;
            let parent_links = get_node_links(ctx, None, Some(node.id.as_str())).await?;
            for parent_id in parent_links.iter().map(|a| a.parent.clone()) {
                if layer_head.path.contains(&parent_id) { continue; } // parent-id is already part of path; ignore, so we don't cause infinite-loop
                if node_ids_to_ignore.contains(&parent_id) { continue; }
                new_layer_heads.push(Head { id: parent_id.clone(), path: vec![parent_id.clone()].into_iter().chain(layer_head.path.clone().into_iter()).collect() });
            }
        }
        current_layer_heads = new_layer_heads;
    }
    Ok(None)
}
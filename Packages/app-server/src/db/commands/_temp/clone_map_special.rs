use std::fmt::{Display, Formatter};

use futures_util::{pin_mut, Stream, StreamExt};
use rust_shared::anyhow::{anyhow, ensure, Context, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{async_stream, InputObject, SimpleObject, Subscription, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::indexmap::map;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::{FReceiver, FSender, JSONValue};
use rust_shared::{anyhow, async_graphql, flume, serde_json, to_sub_err, GQLError, SubError};
use tracing::{info, warn};

use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::add_child_node::AddChildNodeExtras;
use crate::db::commands::add_map::{add_map, AddMapInput};
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::maps::{get_map, MapInput};
use crate::db::node_links::{get_node_links, ChildGroup, NodeLinkInput};
use crate::db::node_phrasings::{get_first_non_empty_text_in_phrasing, get_first_non_empty_text_in_phrasing_embedded, NodePhrasing_Embedded};
use crate::db::node_revisions::{get_node_revision, NodeRevision, NodeRevisionInput};
use crate::db::nodes::{get_node, get_node_children};
use crate::db::nodes_::_node::{Node, NodeInput};
use crate::db::nodes_::_node_type::NodeType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::utils::general::order_key::OrderKey;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::super::_command::{tbd, upsert_db_entry_by_id_for_struct, NoExtras};
use super::super::_shared::add_node::add_node;
use super::super::add_child_node::{add_child_node, AddChildNodeInput};

wrap_slow_macros! {

#[derive(Default)]
pub struct SubscriptionShard_CloneMapSpecial;
#[Subscription]
impl SubscriptionShard_CloneMapSpecial {
	async fn clone_map_special<'a>(&self, gql_ctx: &'a async_graphql::Context<'a>, input: CloneMapSpecialInput, only_validate: Option<bool>) -> impl Stream<Item = Result<CloneMapSpecialResult, SubError>> + 'a {
		let base_stream = async_stream::stream! {
			let mut anchor = DataAnchorFor1::empty(); // holds pg-client
			let ctx = AccessorContext::new_write_advanced(&mut anchor, gql_ctx, false, Some(false)).await.map_err(to_sub_err)?;
			let actor = get_user_info_from_gql_ctx(gql_ctx, &ctx).await.map_err(to_sub_err)?;
			let input_json = serde_json::to_string(&input).map_err(to_sub_err)?;

			let mut nodes_cloned = 0;
			let mut nodes_warned: Vec<String> = vec![];
			let (nodes_warned_s1, nodes_warned_r1): (FSender<String>, FReceiver<String>) = flume::unbounded();
			let mut last_result: Result<CloneMapSpecialResult, SubError> = Err(anyhow!("No results yet")).map_err(to_sub_err);

			// use block here, to elucidate any code mistakes that might keep a reference from within "stream" alive longer than it should
			{
				let stream = clone_map_special(&ctx, &actor, false, input, Default::default(), nodes_warned_s1);
				pin_mut!(stream); // needed for iteration
				while let Some(subresult) = stream.next().await {
					// first, collect any buffered warnings into the nodes_warned list
					while let Ok(node_id) = nodes_warned_r1.try_recv() {
						if !nodes_warned.contains(&node_id) {
							nodes_warned.push(node_id);
						}
					}

					// then process the next "main stream" result (ie. of another node having been cloned)
					match subresult {
						Err(e) => {
							last_result = Err(e).map_err(to_sub_err);
							//yield last_result.clone();
							last_result.clone()?; // use this syntax, to halt if error is hit
						},
						Ok((new_map_id, _node_id)) => {
							nodes_cloned += 1;
							last_result = Ok(CloneMapSpecialResult { newMapID: new_map_id.clone(), nodesCloned: nodes_cloned, nodesWarned: nodes_warned.clone(), doneAt: None });

							// only update every X nodes (else eg. gql-playground UI can become unresponsive)
							let interval = match nodes_cloned {
								x if x < 10 => 1,
								x if x < 100 => 10,
								x if x < 1000 => 100,
								x if x < 10000 => 500,
								_ => 1000,
							};
							if nodes_cloned % interval == 0 {
								yield last_result.clone();
							}
						},
					}
				}
			}

			// sync from: _command.rs
			if only_validate.unwrap_or(false) {
				// before rolling back, ensure that none of the constraints are violated at this point (we must check manually, since commit is never called)
				crate::utils::db::accessors::trigger_deferred_constraints(&ctx.tx).await.map_err(to_sub_err)?;

				// the transaction would be rolled-back automatically after this blocks ends, but let's call rollback() explicitly just to be clear/certain
				ctx.tx.rollback().await.map_err(to_sub_err)?;
				tracing::info!("Command completed a \"validation only\" run without hitting errors. @NodesCloned:{:?} @Input:{} ", last_result, input_json);
			} else {
				ctx.tx.commit().await.map_err(to_sub_err)?;
				tracing::info!("Command executed. @Result:{:?} @Input:{}", last_result, input_json);
			}

			if let Ok(inner) = last_result {
				yield Ok(CloneMapSpecialResult {
					doneAt: Some(time_since_epoch_ms_i64()),
					..inner
				});
			}
		};
		base_stream
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct CloneMapSpecialInput {
	pub mapID: String,
}

#[derive(SimpleObject, Debug, Clone)]
pub struct CloneMapSpecialResult {
	pub newMapID: String,
	pub nodesCloned: i32,
	pub nodesWarned: Vec<String>,
	pub doneAt: Option<i64>,
}

}

pub fn clone_map_special<'a>(ctx: &'a AccessorContext<'_>, actor: &'a User, _is_root: bool, input: CloneMapSpecialInput, _extras: NoExtras, nodes_warned_s1: FSender<String>) -> impl Stream<Item = Result<(String, String), Error>> + 'a {
	let base_stream = async_stream::stream! {
		let CloneMapSpecialInput { mapID } = input;

		let map = get_map(ctx, &mapID).await?;
		let new_map = MapInput {
			name: format!("Clone of {}", map.name),
			accessPolicy: map.accessPolicy,
			note: map.note.clone(),
			noteInline: map.noteInline,
			defaultExpandDepth: map.defaultExpandDepth,
			nodeAccessPolicy: map.nodeAccessPolicy.clone(),
			featured: map.featured,
			editors: map.editors.clone(),
			extras: json!({}),
		};
		let new_map_input = AddMapInput {map: new_map};
		let new_map_result = add_map(ctx, actor, false, new_map_input, Default::default()).await?;

		let root_node = get_node(ctx, &map.rootNode).await?;
		let new_root_node = get_node(ctx, &new_map_result.root_node_id).await?;

		let stream = clone_node_tree_special(ctx, actor, map.id.as_str(), root_node, new_root_node, nodes_warned_s1);
		for await result in stream {
			match result {
				Err(e) => Err(e)?, // use this syntax, to halt if error is hit
				Ok(node_id) => yield Ok((new_map_result.id.clone(), node_id)),
			}
		}
	};
	base_stream
}

pub fn clone_node_tree_special<'a>(ctx: &'a AccessorContext<'_>, actor: &'a User, map_id: &'a str, old_node: Node, new_node: Node, nodes_warned_s1: FSender<String>) -> impl Stream<Item = Result<String, Error>> + 'a {
	let base_stream = async_stream::stream! {
		//let rev = get_node_revision(ctx, node.c_currentRevision.as_str()).await?;
		let incrementEdits = Some(false);

		let links = get_node_links(ctx, Some(old_node.id.as_str()), None).await?;
		for link in links {
			let child = get_node(ctx, link.child.as_str()).await?;
			let child_rev = get_node_revision(ctx, child.c_currentRevision.as_str()).await?;

			// if child is an argument, try to "skip over it" during construction of map-clone (ie. to remove the sl-unwanted "intermediary node")
			if child.r#type == NodeType::argument {
				let grandchild_links = get_node_links(ctx, Some(child.id.as_str()), None).await?;
				let has_attachments = child_rev.attachments.len() > 0;
				// ensure that argument has no title, in any of the text_XXX fields
				let first_non_empty_title = get_first_non_empty_text_in_phrasing_embedded(&child_rev.phrasing);
				/*if let Some(title) = first_non_empty_title {
					warn!("Argument node #{} has a non-empty title. If this is a dry-run, it's recommended to investigate these entries before proceeding. @title:\n\t{}", child.id.as_str(), title);
				}*/

				// only "get rid of the intermediary argument" when it's "safe to do so", which requires that: (all of...)
				// 1) The arg has only 0-1 children.
				// 2) The arg has no attachments.
				// 3) The arg has only null/empty titles.
				let safe_to_omit = grandchild_links.len() <= 1 && !has_attachments && first_non_empty_title.is_none();

				// add warnings (visible to graphql caller) for arguments that aren't safe to omit (since we *want* all arguments to be omittable, if possible)
				if !safe_to_omit {
					nodes_warned_s1.send(format!("{} @childCount:{} @hasAttach:{} @hasNonEmptyTitle:{}", child.id.as_str(), grandchild_links.len(), has_attachments, first_non_empty_title.is_some()))?;
				}

				if safe_to_omit {
					// rather than add this argument itself, skip over it and add its children directly instead
					for grandchild_link in grandchild_links {
						let grandchild = get_node(ctx, &grandchild_link.child).await?;
						let grandchild_rev = get_node_revision(ctx, grandchild.c_currentRevision.as_str()).await?;
						let add_child_input = AddChildNodeInput {
							mapID: Some(map_id.o()),
							parentID: new_node.id.as_str().o(),
							node: grandchild.clone().into_input(true),
							revision: grandchild_rev.into_input(false),
							link: NodeLinkInput {
								parent: None,
								child: None,
								group: match new_node.r#type {
									NodeType::category => ChildGroup::generic,
									_ => ChildGroup::freeform,
								},
								orderKey: link.orderKey.clone(), // use [old_node -> child] link's order-key, since that ordering is more meaningful
								form: grandchild_link.form,
								seriesAnchor: grandchild_link.seriesAnchor,
								seriesEnd: grandchild_link.seriesEnd,
								polarity: grandchild_link.polarity,
							},
							incrementEdits,
						};
						let add_node_result = add_child_node(ctx, actor, false, add_child_input, AddChildNodeExtras { avoid_recording_command_run: true }).await?;
						yield Ok(add_node_result.nodeID.clone());
						let new_node = get_node(ctx, &add_node_result.nodeID).await?;

						//Box::pin(clone_node_tree_special(ctx, actor, map_id, grandchild, new_node)).await?;
						for await result in Box::pin(clone_node_tree_special(ctx, actor, map_id, grandchild, new_node, nodes_warned_s1.clone())) {
							yield Ok(result?); // use this syntax, to halt if error is hit
						}
					}
					// we've done special processing for this argument node, so skip the generic processing below
					continue;
				}
			}

			let add_child_input = AddChildNodeInput {
				mapID: Some(map_id.o()),
				parentID: new_node.id.as_str().o(),
				node: child.clone().into_input(true),
				revision: child_rev.into_input(false),
				link: link.into_input(false),
				incrementEdits,
			};
			let add_child_result = add_child_node(ctx, actor, false, add_child_input, AddChildNodeExtras { avoid_recording_command_run: true }).await?;
			yield Ok(add_child_result.nodeID.clone());
			let new_child = get_node(ctx, &add_child_result.nodeID).await?;

			//Box::pin(clone_node_tree_special(ctx, actor, map_id, child, new_child)).await?;
			for await result in Box::pin(clone_node_tree_special(ctx, actor, map_id, child, new_child, nodes_warned_s1.clone())) {
				yield Ok(result?); // use this syntax, to halt if error is hit
			}
		}
	};
	base_stream
}

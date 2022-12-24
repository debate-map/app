use std::{rc::Rc, sync::Arc};

use rust_shared::anyhow::{anyhow, Error};
use rust_shared::async_graphql::ID;
use async_recursion::async_recursion;
use futures_util::{Future, FutureExt, TryStreamExt, StreamExt, pin_mut};
use indexmap::IndexMap;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::RwLock;
use rust_shared::tokio_postgres::{Row, types::ToSql};
use crate::db::node_revisions::NodeRevision;
use crate::db::nodes_::_node::Node;
use crate::{db::{medias::{Media, get_media}, terms::{Term, get_terms_attached}, nodes::{get_node}, node_links::{NodeLink, get_node_links}, node_revisions::{get_node_revision}, node_phrasings::{NodePhrasing, get_node_phrasings}, node_tags::{NodeTag, get_node_tags}}, utils::{db::{queries::{get_entries_in_collection_basic}, sql_fragment::SQLFragment, filter::{FilterInput, QueryFilter}, accessors::AccessorContext}}};
use super::{subtree::Subtree};

#[derive(Default)]
pub struct SubtreeCollector_Old {
    //pub root_path_segments: Vec<String>,

    pub terms: IndexMap<String, Term>,
    pub medias: IndexMap<String, Media>,
    pub nodes: IndexMap<String, Node>,
    pub node_links: IndexMap<String, NodeLink>,
    pub node_revisions: IndexMap<String, NodeRevision>,
    pub node_phrasings: IndexMap<String, NodePhrasing>,
    pub node_tags: IndexMap<String, NodeTag>,
}
impl SubtreeCollector_Old {
    pub fn to_subtree(self: &Self) -> Subtree {
        let result = Subtree {
            terms: self.terms.clone().into_values().collect(),
            medias: self.medias.clone().into_values().collect(),
            nodes: self.nodes.clone().into_values().collect(),
            nodeLinks: self.node_links.clone().into_values().collect(),
            nodeRevisions: self.node_revisions.clone().into_values().collect(),
            nodePhrasings: self.node_phrasings.clone().into_values().collect(),
            nodeTags: self.node_tags.clone().into_values().collect(),
        };
        // commented; we want this endpoint's algorithm "frozen", since the alt-frontend relies on it for consistent ordering with debate-map's frontend
        // (in the long-term, this should be resolved by getting accurate "orderKey" fields set for everything, and definitely-correct inserting/updating of them -- but for now, just freeze the "subtreeOld" algorithm)
        //result.sort_all_entries();
        result
    }
}

/*pub enum FindSubtreeError {
    InvalidPath,
}*/

//pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a, Global>>;
#[async_recursion]
//#[async_recursion(?Send)]
pub async fn populate_subtree_collector_old(ctx: &AccessorContext<'_>, current_path: String, max_depth: usize, root_path_segments: &Vec<String>, collector_arc: Arc<RwLock<SubtreeCollector_Old>>) -> Result<(), Error> {
    let path_segments: Vec<&str> = current_path.split("/").collect();
    let parent_node_id = path_segments.iter().nth_back(1).map(|a| a.to_string());
    let node_id = path_segments.iter().last().ok_or(anyhow!("Invalid path:{current_path}"))?.to_string();
    //search_info = search_info ?? new GetSubtree_SearchInfo({rootPathSegments: pathSegments});

    // get data
    let node = get_node(ctx, &node_id).await?;
    // use match, so we can reuse outer async-context (don't know how to handle new ones in .map() easily yet)
    let node_link = match parent_node_id {
        Some(parent_id) => get_node_links(ctx, Some(&parent_id), Some(&node_id)).await?.into_iter().nth(0),
        None => None,
    };
    let node_current = get_node_revision(ctx, &node.c_currentRevision).await?;
    let phrasings = get_node_phrasings(ctx, &node_id).await?;
    let terms = get_terms_attached(ctx, &node_current.id.0).await?;
    let medias = {
        let mut temp = vec![];
        for attachment in node_current.clone().attachments {
            if let Some(media_attachment) = attachment.media {
                let media = get_media(ctx, &media_attachment["id"].as_str().unwrap().to_owned()).await?;
                temp.push(media);
            };
        }
        temp
    };
    let tags = get_node_tags(ctx, &node_id).await?;

    // store data
    {
        // check link first, because link can differ depending on path (ie. even if node has been seen, this link may not have been)
        let arc_clone = collector_arc.clone();
        let mut collector = arc_clone.write().await;
        let isSubtreeRoot = path_segments.join("/") == root_path_segments.join("/");
        if let Some(node_link) = node_link {
            if !isSubtreeRoot && !collector.node_links.contains_key(&node_link.id.0) {
                collector.node_links.insert(node_link.id.to_string(), node_link);
            }
        }

        // now check if node itself has been seen/processed; if so, ignore the rest of its data
        if collector.nodes.contains_key(&node.id.0) { return Ok(()); }
        collector.nodes.insert(node.id.to_string(), node);

        assert!(!collector.node_revisions.contains_key(&node_current.id.0), "Node-revisions should be node-specific, yet entry ({}) was seen twice.", node_current.id.0);
        collector.node_revisions.insert(node_current.id.to_string(), node_current.clone());

        for phrasing in phrasings {
            assert!(!collector.node_phrasings.contains_key(&phrasing.id.0), "Node-phrasings should be node-specific, yet entry ({}) was seen twice.", phrasing.id.0);
            collector.node_phrasings.insert(phrasing.id.to_string(), phrasing);
        }

        for term in terms {
            if !collector.terms.contains_key(&term.id.0) {
                collector.terms.insert(term.id.to_string(), term);
            }
        }

        for media in medias {
            //if !collector.terms.contains_key(media_attachment["id"].as_str().unwrap()) {
            if !collector.medias.contains_key(&media.id.0) {
                collector.medias.insert(media.id.to_string(), media);
            }
        }

        for tag in tags {
            if !collector.node_tags.contains_key(&tag.id.0) {
                collector.node_tags.insert(tag.id.to_string(), tag);
            }
        }
    }

    // populate-data from descendants/subtree underneath the current node (must happen after store-data, else the collector.nodes.contains_key checks might get skipped past)
    let currentDepth = path_segments.len() - root_path_segments.len();
    if currentDepth < max_depth {
        /*for link in get_node_links(ctx, Some(&node_id), None).await? {
            let child_id = link.child;
            populate_subtree_collector(ctx, format!("{}/{}", current_path, child_id), max_depth, collector).await?;
        }*/
        let links = get_node_links(ctx, Some(&node_id), None).await?;
        let mut futures = vec![];
        for link in links {
            let child_id = link.child;
            futures.push(populate_subtree_collector_old(ctx, format!("{}/{}", current_path, child_id), max_depth, root_path_segments, collector_arc.clone()));
        }
        rust_shared::futures::future::join_all(futures).await;
    }
    Ok(())
}
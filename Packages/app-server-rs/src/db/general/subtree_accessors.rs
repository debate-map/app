use std::{rc::Rc, sync::Arc};

use anyhow::{anyhow, Error};
use async_graphql::ID;
use async_recursion::async_recursion;
use deadpool_postgres::Transaction;
use futures_util::{Future, FutureExt};
use indexmap::IndexMap;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio::sync::RwLock;
use tokio_postgres::Row;
use crate::{db::{medias::Media, terms::Term, nodes::MapNode, node_child_links::NodeChildLink, node_revisions::MapNodeRevision, node_phrasings::MapNodePhrasing, node_tags::MapNodeTag}, utils::{db::{queries::get_entries_in_collection_basic, filter::Filter}, type_aliases::JSONValue}};
use super::subtree::Subtree;

pub struct AccessorContext<'a> {
    tx: Transaction<'a>,
}
impl<'a> AccessorContext<'a> {
    pub fn new(tx: Transaction<'a>) -> Self {
        Self {
            tx
        }
    }
}

#[derive(Default)]
pub struct SubtreeCollector {
    //pub root_path_segments: Vec<String>,

    pub terms: IndexMap<String, Term>,
    pub medias: IndexMap<String, Media>,
    pub nodes: IndexMap<String, MapNode>,
    pub node_child_links: IndexMap<String, NodeChildLink>,
    pub node_revisions: IndexMap<String, MapNodeRevision>,
    pub node_phrasings: IndexMap<String, MapNodePhrasing>,
    pub node_tags: IndexMap<String, MapNodeTag>,
}
impl SubtreeCollector {
    pub fn to_subtree(self: &Self) -> Subtree {
        Subtree {
            terms: self.terms.clone().into_values().collect(),
            medias: self.medias.clone().into_values().collect(),
            nodes: self.nodes.clone().into_values().collect(),
            nodeChildLinks: self.node_child_links.clone().into_values().collect(),
            nodeRevisions: self.node_revisions.clone().into_values().collect(),
            nodePhrasings: self.node_phrasings.clone().into_values().collect(),
            nodeTags: self.node_tags.clone().into_values().collect(),
        }
    }
}

/*pub enum FindSubtreeError {
    InvalidPath,
}*/

//pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a, Global>>;
#[async_recursion]
pub async fn populate_subtree_collector(ctx: &AccessorContext<'_>, current_path: String, max_depth: usize, root_path_segments: &Vec<String>, collector_arc: Arc<RwLock<SubtreeCollector>>) -> Result<(), Error> {
    let path_segments: Vec<&str> = current_path.split("/").collect();
    let parent_node_id = path_segments.iter().nth_back(1).map(|a| a.to_string());
    let node_id = path_segments.iter().last().ok_or(anyhow!("Invalid path:{current_path}"))?.to_string();
    //search_info = search_info ?? new GetSubtree_SearchInfo({rootPathSegments: pathSegments});

    // get data
    let node = get_node(ctx, &node_id).await?;
    // use match, so we can reuse outer async-context (don't know how to handle new ones in .map() easily yet)
    let node_link = match parent_node_id {
        Some(parent_id) => get_node_child_links(ctx, Some(&parent_id), Some(&node_id)).await?.into_iter().nth(0),
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
    let tags = get_tags_for(ctx, &node_id).await?;

    // store data
    {
        // check link first, because link can differ depending on path (ie. even if node has been seen, this link may not have been)
        let arc_clone = collector_arc.clone();
        let mut collector = arc_clone.write().await;
        let isSubtreeRoot = path_segments.join("/") == root_path_segments.join("/");
        if let Some(node_link) = node_link {
            if !isSubtreeRoot && !collector.node_child_links.contains_key(&node_link.id.0) {
                collector.node_child_links.insert(node_link.id.to_string(), node_link);
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
        /*for link in get_node_child_links(ctx, Some(&node_id), None).await? {
            let child_id = link.child;
            populate_subtree_collector(ctx, format!("{}/{}", current_path, child_id), max_depth, collector).await?;
        }*/
        let links = get_node_child_links(ctx, Some(&node_id), None).await?;
        let mut futures = vec![];
        for link in links {
            let child_id = link.child;
            futures.push(populate_subtree_collector(ctx, format!("{}/{}", current_path, child_id), max_depth, root_path_segments, collector_arc.clone()));
        }
        futures::future::join_all(futures).await;
    }
    Ok(())
}

// accessors // todo: probably move these to the "db/XXX" files
// ==========

pub async fn get_db_entry<'a, T: From<Row> + Serialize>(ctx: &AccessorContext<'a>, table_name: &str, filter: &Filter) -> Result<T, Error> {
    let entries = get_db_entries(ctx, table_name, filter).await?;
    let entry = entries.into_iter().nth(0);
    let result = entry.ok_or(anyhow!(r#"No entries found in table "{table_name}" matching filter:{filter:?}"#))?;
    Ok(result)
}
pub async fn get_db_entries<'a, T: From<Row> + Serialize>(ctx: &AccessorContext<'a>, table_name: &str, filter: &Filter) -> Result<Vec<T>, Error> {
    let query_func = |str1: String| async move {
        ctx.tx.query(&str1, &[]).await
    };
    let (_entries, entries_as_type) = get_entries_in_collection_basic(query_func, table_name, filter, None).await?; // pass no mtx, because we don't care about optimizing the "subtree" endpoint atm
    Ok(entries_as_type)
}

/*#[derive(Serialize, Deserialize)]
struct MapNodeL3 {
    // todo
}
pub async fn get_node_l3(ctx: &AccessorContext<'_>, path: String) -> Option<MapNodeL3> {
    let id = path.split("/").last();
    let node: Option<MapNode> = get_db_entry(ctx, "nodes", &Some(json!({
        "id": {"equalTo": id}
    }))).await;

    let node_l3: MapNodeL3 = node;
    Some(node_l3)
}*/

pub async fn get_node(ctx: &AccessorContext<'_>, id: &str) -> Result<MapNode, Error> {
    get_db_entry(ctx, "nodes", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_node_phrasings(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<MapNodePhrasing>, Error> {
    get_db_entries(ctx, "nodePhrasings", &Some(json!({
        "node": {"equalTo": node_id}
    }))).await
}
pub async fn get_terms_attached(ctx: &AccessorContext<'_>, node_rev_id: &str) -> Result<Vec<Term>, Error> {
    let rev = get_node_revision(ctx, node_rev_id).await?;
    let empty = &vec![];
    let term_values = rev.phrasing["terms"].as_array().unwrap_or(empty);
    let terms_futures = term_values.into_iter().map(|attachment| async {
        get_term(ctx, attachment["id"].as_str().unwrap()).await.unwrap()
    });
    let terms: Vec<Term> = futures::future::join_all(terms_futures).await;
    Ok(terms)
}
pub async fn get_media(ctx: &AccessorContext<'_>, id: &str) -> Result<Media, Error> {
    get_db_entry(ctx, "medias", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_node_child_links(ctx: &AccessorContext<'_>, parent_id: Option<&str>, child_id: Option<&str>) -> Result<Vec<NodeChildLink>, Error> {
    let mut filter_map = serde_json::Map::new();
    if let Some(parent_id) = parent_id {
        filter_map.insert("parent".to_owned(), json!({"equalTo": parent_id}));
    }
    if let Some(child_id) = child_id {
        filter_map.insert("child".to_owned(), json!({"equalTo": child_id}));
    }
    get_db_entries(ctx, "nodeChildLinks", &Some(JSONValue::Object(filter_map))).await
}

pub async fn get_term(ctx: &AccessorContext<'_>, id: &str) -> Result<Term, Error> {
    get_db_entry(ctx, "terms", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_node_revision(ctx: &AccessorContext<'_>, id: &str) -> Result<MapNodeRevision, Error> {
    get_db_entry(ctx, "nodeRevisions", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_tags_for(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<MapNodeTag>, Error> {
    get_db_entries(ctx, "nodeTags", &Some(json!({
        "nodes": {"contains": node_id}
    }))).await
}
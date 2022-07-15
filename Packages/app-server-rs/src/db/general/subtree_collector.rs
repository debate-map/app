use std::{rc::Rc, sync::Arc};
use anyhow::{anyhow, Error};
use async_graphql::ID;
use async_recursion::async_recursion;
use futures_util::{Future, FutureExt, TryStreamExt, StreamExt, pin_mut};
use indexmap::IndexMap;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio::sync::RwLock;
use tokio_postgres::{Row, types::ToSql};
use crate::{db::{medias::{Media, get_media}, terms::{Term, get_terms_attached}, nodes::{MapNode, get_node}, node_child_links::{NodeChildLink, get_node_child_links}, node_revisions::{MapNodeRevision, get_node_revision}, node_phrasings::{MapNodePhrasing, get_node_phrasings}, node_tags::{MapNodeTag, get_tags_for}, commands::_command::ToSqlWrapper}, utils::{db::{queries::{get_entries_in_collection_basic}, sql_fragment::SQLFragment, filter::{FilterInput, QueryFilter}, accessors::AccessorContext}, type_aliases::JSONValue, general::general::to_anyhow}};
use super::{subtree::Subtree};

/// Helper to make it easier to provide inline sql-params of different types.
pub fn params<'a>(parameters: &'a [&'a (dyn ToSql + Sync)]) -> Vec<&(dyn ToSql + Sync)> {
    parameters.iter()
        .map(|x| *x as &(dyn ToSql + Sync))
        .collect()
}

#[async_recursion]
pub async fn get_node_subtree(ctx: &AccessorContext<'_>, root_id: String, max_depth: usize) -> Result<Subtree, Error> {
    let node_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT nodes.* from "nodes" nodes JOIN descendants($1, $2) USING (id)"#, params(&[&root_id, &(max_depth as i32)])).await?.try_collect().await?;
    let link_rows: Vec<Row> = {
        if max_depth > 0 {
            let max_depth_minus_1 = max_depth - 1; // must reduce depth by 1, to avoid finding links "from the lowest depth, to one depth beyond the depth limit"
            ctx.tx.query_raw(r#"SELECT links.* from "nodeChildLinks" links JOIN descendants($1, $2) AS d ON (links.parent = d.id)"#, params(&[&root_id, &(max_depth_minus_1 as i32)])).await?.try_collect().await?
        } else {
            vec![]
        }
    };
    let phrasing_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT phrasings.* from "nodePhrasings" phrasings JOIN descendants($1, $2) AS d ON (phrasings.node = d.id)"#, params(&[&root_id, &(max_depth as i32)])).await?.try_collect().await?;
    let tag_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT DISTINCT tags.* from "nodeTags" tags JOIN descendants($1, $2) AS d ON (tags.nodes @> array[d.id])"#, params(&[&root_id, &(max_depth as i32)])).await?.try_collect().await?;
    let revision_rows: Vec<Row> = ctx.tx.query_raw(r#"
        SELECT revisions.* from "nodeRevisions" revisions JOIN (
            SELECT nodes.* from "nodes" nodes JOIN descendants($1, $2) USING (id)
        ) AS d ON (revisions.id = d."c_currentRevision")
    "#, params(&[&root_id, &(max_depth as i32)])).await?.try_collect().await?;
    let term_rows: Vec<Row> = ctx.tx.query_raw(r#"
        SELECT terms.* from "terms" terms JOIN (
            SELECT DISTINCT
                temp.terms_extracted->'id' "id"
            FROM (
                SELECT revisions.* from "nodeRevisions" revisions JOIN (
                    SELECT nodes.* from "nodes" nodes JOIN descendants($1, $2) USING (id)
                ) AS d ON (revisions.id = d."c_currentRevision")
            ) latest_revs,
            LATERAL (SELECT jsonb_array_elements(latest_revs.phrasing->'terms') terms_extracted) temp
        ) AS term_ids_from_revisions ON (terms.id = term_ids_from_revisions.id#>>'{}')
    "#, params(&[&root_id, &(max_depth as i32)])).await?.try_collect().await?;
    let media_rows: Vec<Row> = ctx.tx.query_raw(r#"
        SELECT medias.* from "medias" medias JOIN (
            SELECT DISTINCT
                temp.attachments_extracted->'media'->'id' "id"
            FROM (
                SELECT revisions.* from "nodeRevisions" revisions JOIN (
                    SELECT nodes.* from "nodes" nodes JOIN descendants($1, $2) USING (id)
                ) AS d ON (revisions.id = d."c_currentRevision")
            ) latest_revs,
            LATERAL (SELECT jsonb_array_elements(latest_revs.attachments) attachments_extracted) temp
        ) AS media_ids_from_revisions ON (medias.id = media_ids_from_revisions.id#>>'{}')
    "#, params(&[&root_id, &(max_depth as i32)])).await?.try_collect().await?;

    let mut subtree = Subtree {
        terms: term_rows.into_iter().map(|a| a.into()).collect(),
        medias: media_rows.into_iter().map(|a| a.into()).collect(),
        nodes: node_rows.into_iter().map(|a| a.into()).collect(),
        nodeChildLinks: link_rows.into_iter().map(|a| a.into()).collect(),
        nodeRevisions: revision_rows.into_iter().map(|a| a.into()).collect(),
        nodePhrasings: phrasing_rows.into_iter().map(|a| a.into()).collect(),
        nodeTags: tag_rows.into_iter().map(|a| a.into()).collect(),
    };
    subtree.sort_all_entries();
    Ok(subtree)
}
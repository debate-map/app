use super::subtree::Subtree;
use crate::{
	db::{
		commands::_command::ToSqlWrapper,
		medias::{get_media, Media},
		node_links::{get_node_links, NodeLink},
		node_phrasings::{get_node_phrasings, NodePhrasing},
		node_revisions::get_node_revision,
		node_tags::{get_node_tags, NodeTag},
		nodes::get_node,
		terms::{get_terms_attached, Term},
	},
	utils::db::{
		accessors::AccessorContext,
		filter::{FilterInput, QueryFilter},
		queries::get_entries_in_collection_base,
		sql_fragment::SQLFragment,
	},
};
use async_recursion::async_recursion;
use futures_util::{pin_mut, Future, FutureExt, StreamExt, TryStreamExt};
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::async_graphql::ID;
use rust_shared::indexmap::IndexMap;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::RwLock;
use rust_shared::tokio_postgres::{types::ToSql, Row};
use std::{rc::Rc, sync::Arc};

/// Helper to make it easier to provide inline sql-params of different types.
pub fn params<'a>(parameters: &'a [&'a (dyn ToSql + Sync)]) -> Vec<&(dyn ToSql + Sync)> {
	parameters.iter().map(|x| *x as &(dyn ToSql + Sync)).collect()
}

#[async_recursion]
#[rustfmt::skip]
pub async fn get_node_subtree(ctx: &AccessorContext<'_>, root_id: String, max_depth_usize: usize) -> Result<Subtree, Error> {
    let max_depth = max_depth_usize as i32;
    
    //let node_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT nodes.* from "nodes" nodes JOIN descendants2($1, $2) USING (id)"#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    // use this variant of the query to preserve the ordering received from the descendants function
    let node_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT nodes.* from descendants($1, $2) as d JOIN nodes USING (id)"#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    let link_rows: Vec<Row> = {
        if max_depth > 0 {
            //let max_depth_minus_1 = max_depth - 1; // must reduce depth by 1, to avoid finding links "from the lowest depth, to one depth beyond the depth limit"
            //ctx.tx.query_raw(r#"SELECT links.* from "nodeLinks" links JOIN descendants($1, $2) AS d ON (links.parent = d.id)"#, params(&[&root_id, &max_depth_minus_1])).await?.try_collect().await?
            //ctx.tx.query_raw(r#"SELECT links.* from "nodeLinks" links JOIN descendants($1, $2) AS d ON (links.parent = d.id)"#, params(&[&root_id, &max_depth_minus_1])).await?.try_collect().await?
            ctx.tx.query_raw(r#"SELECT links.* from descendants($1, $2) as d JOIN "nodeLinks" links ON (links.id = d.link_id)"#, params(&[&root_id, &max_depth])).await?.try_collect().await?
        } else {
            vec![]
        }
    };
    let phrasing_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT phrasings.* from "nodePhrasings" phrasings JOIN descendants($1, $2) AS d ON (phrasings.node = d.id)"#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    let tag_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT DISTINCT tags.* from "nodeTags" tags JOIN descendants($1, $2) AS d ON (tags.nodes @> array[d.id])"#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    let revision_rows: Vec<Row> = ctx.tx.query_raw(r#"
        SELECT revisions.* from "nodeRevisions" revisions JOIN (
            SELECT nodes.* from "nodes" nodes JOIN descendants($1, $2) USING (id)
        ) AS d ON (revisions.id = d."c_currentRevision")
    "#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
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
    "#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
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
    "#, params(&[&root_id, &max_depth])).await?.try_collect().await?;

	let mut subtree = Subtree {
		terms: term_rows.into_iter().map(|a| a.into()).collect(),
		medias: media_rows.into_iter().map(|a| a.into()).collect(),
		nodes: node_rows.into_iter().map(|a| a.into()).collect(),
		nodeLinks: link_rows.into_iter().map(|a| a.into()).collect(),
		nodeRevisions: revision_rows.into_iter().map(|a| a.into()).collect(),
		nodePhrasings: phrasing_rows.into_iter().map(|a| a.into()).collect(),
		nodeTags: tag_rows.into_iter().map(|a| a.into()).collect(),
	};
	subtree.sort_all_entries();
	Ok(subtree)
}

#[async_recursion]
#[rustfmt::skip]
pub async fn get_node_subtree2(ctx: &AccessorContext<'_>, root_id: String, max_depth_usize: usize) -> Result<Subtree, Error> {
    let max_depth = max_depth_usize as i32;
    
    let node_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT nodes.* from descendants2($1, $2) as d JOIN nodes USING (id)"#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    let link_rows: Vec<Row> = {
        if max_depth > 0 {
            //let max_depth_minus_1 = max_depth - 1; // must reduce depth by 1, to avoid finding links "from the lowest depth, to one depth beyond the depth limit"
            //ctx.tx.query_raw(r#"SELECT links.* from "nodeLinks" links JOIN descendants2($1, $2) AS d ON (links.parent = d.id)"#, params(&[&root_id, &max_depth_minus_1])).await?.try_collect().await?
            ctx.tx.query_raw(r#"SELECT links.* from descendants2($1, $2) as d JOIN "nodeLinks" links ON (links.id = d.link_id)"#, params(&[&root_id, &max_depth])).await?.try_collect().await?
        } else {
            vec![]
        }
    };
    let phrasing_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT phrasings.* from "nodePhrasings" phrasings JOIN descendants2($1, $2) AS d ON (phrasings.node = d.id)"#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    let tag_rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT DISTINCT tags.* from "nodeTags" tags JOIN descendants2($1, $2) AS d ON (tags.nodes @> array[d.id])"#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    let revision_rows: Vec<Row> = ctx.tx.query_raw(r#"
        SELECT revisions.* from "nodeRevisions" revisions JOIN (
            SELECT nodes.* from "nodes" nodes JOIN descendants2($1, $2) USING (id)
        ) AS d ON (revisions.id = d."c_currentRevision")
    "#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    let term_rows: Vec<Row> = ctx.tx.query_raw(r#"
        SELECT terms.* from "terms" terms JOIN (
            SELECT DISTINCT
                temp.terms_extracted->'id' "id"
            FROM (
                SELECT revisions.* from "nodeRevisions" revisions JOIN (
                    SELECT nodes.* from "nodes" nodes JOIN descendants2($1, $2) USING (id)
                ) AS d ON (revisions.id = d."c_currentRevision")
            ) latest_revs,
            LATERAL (SELECT jsonb_array_elements(latest_revs.phrasing->'terms') terms_extracted) temp
        ) AS term_ids_from_revisions ON (terms.id = term_ids_from_revisions.id#>>'{}')
    "#, params(&[&root_id, &max_depth])).await?.try_collect().await?;
    let media_rows: Vec<Row> = ctx.tx.query_raw(r#"
        SELECT medias.* from "medias" medias JOIN (
            SELECT DISTINCT
                temp.attachments_extracted->'media'->'id' "id"
            FROM (
                SELECT revisions.* from "nodeRevisions" revisions JOIN (
                    SELECT nodes.* from "nodes" nodes JOIN descendants2($1, $2) USING (id)
                ) AS d ON (revisions.id = d."c_currentRevision")
            ) latest_revs,
            LATERAL (SELECT jsonb_array_elements(latest_revs.attachments) attachments_extracted) temp
        ) AS media_ids_from_revisions ON (medias.id = media_ids_from_revisions.id#>>'{}')
    "#, params(&[&root_id, &max_depth])).await?.try_collect().await?;

	let subtree = Subtree {
		terms: term_rows.into_iter().map(|a| a.into()).collect(),
		medias: media_rows.into_iter().map(|a| a.into()).collect(),
		nodes: node_rows.into_iter().map(|a| a.into()).collect(),
		nodeLinks: link_rows.into_iter().map(|a| a.into()).collect(),
		nodeRevisions: revision_rows.into_iter().map(|a| a.into()).collect(),
		nodePhrasings: phrasing_rows.into_iter().map(|a| a.into()).collect(),
		nodeTags: tag_rows.into_iter().map(|a| a.into()).collect(),
	};
	//subtree.sort_all_entries();
	Ok(subtree)
}

use crate::{bytes, match_cond_to_iter, serde_json, EntryBlob, EntryJSON, IteratorV, JSONMap, JSONValue, ToOwnedV, RLS};
use crate::{cf, TableDef};
use crate::{
	tokio_postgres,
	tokio_postgres::{types::ToSql, Row},
};
use anyhow::{anyhow, Context, Error};
use async_graphql::{self, MaybeUndefined};
use deadpool_postgres::{Pool, Transaction};
use futures_util::{Future, TryStreamExt};
use indoc::indoc;
use itertools::{chain, Itertools};
use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::{json, Map};
use tracing::info;

/*pub fn entry_json_to_entry_struct_in_option<T: From<Row> + Serialize + DeserializeOwned>(entry_json: Option<EntryJSON>) -> Result<Option<T>, Error> {
	Ok(match entry_json {
		None => None,
		Some(entry_json) => serde_json::from_value(JSONValue::Object(entry_json.0))?,
	})
}

pub fn entry_blobs_to_entry_jsons(entry_blobs: Vec<EntryBlob>, table: &str) -> Result<Vec<EntryJSON>, Error> {
	entry_blobs.into_iter().map(|blob| blob.up(table)).collect()
}
pub fn entry_jsons_to_entry_structs<T: DeserializeOwned>(entry_jsons: Vec<EntryJSON>) -> Result<Vec<T>, Error> {
	entry_jsons.into_iter().map(|json| json.up()).collect()
}*/

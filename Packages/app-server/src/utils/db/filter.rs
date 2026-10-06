// the crate's filter, plus a bridge under the old name and row type for store/'s live-query code
pub use graphlink_rust::db::filter::*;
use graphlink_rust::EntryBlob;
use rust_shared::anyhow::Error;
use rust_shared::utils::type_aliases::RowData;

pub fn entry_matches_filter(entry: &RowData, filter: &QueryFilter) -> Result<bool, Error> {
	entry_blob_matches_filter(&EntryBlob(entry.clone()), filter) // the crate's check takes an EntryBlob (same map inside), hence the clone
}

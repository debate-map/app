// the crate's subscription handlers, plus what the table files still use from here: gql_set_impl!, a wrapper without cached_entry_hashes, and the GQLSet name
pub use graphlink_rust::db::generic_handlers::subscriptions::*;
pub use graphlink_rust::{ListChange, ListChange as GQLSet, ListChangeCore, ListChangeType};
use futures_util::Stream;
use rust_shared::async_graphql;
use rust_shared::serde::{de::DeserializeOwned, Serialize};
use rust_shared::SubError;

use crate::utils::db::filter::FilterInput;

#[macro_export]
macro_rules! gql_set_impl {
	($my_type:ident) => {
		pastey::paste! {
			#[derive(Clone)]
			pub struct [<GQLSet_ $my_type>] {
				pub core: $crate::utils::db::generic_handlers::subscriptions::ListChangeCore<$my_type>,
			}

			#[cfg_attr(not(feature = "rust-analyzer"), Object)]
			impl [<GQLSet_ $my_type>] {
				// old structure (the whole list only for a FullList change; for the others, just the changed entry)
				async fn nodes(&self) -> &Vec<$my_type> {
					&self.core.data
				}

				// new structure
				async fn changeType(&self) -> &$crate::utils::db::generic_handlers::subscriptions::ListChangeType {
					&self.core.changeType
				}
				async fn idOfRemoved(&self) -> &Option<String> {
					&self.core.idOfRemoved
				}
				async fn data(&self) -> &Vec<$my_type> {
					&self.core.data
				}
				async fn hashes(&self) -> &std::collections::HashMap<String, String> {
					&self.core.hashes
				}
			}

			impl $crate::utils::db::generic_handlers::subscriptions::ListChange<$my_type> for [<GQLSet_ $my_type>] {
				fn from(core: $crate::utils::db::generic_handlers::subscriptions::ListChangeCore<$my_type>) -> Self {
					Self { core }
				}
			}
		}
	};
}

/// The crate's collection handler, without its `cached_entry_hashes` argument, which the table files don't pass yet.
pub async fn handle_generic_gql_collection_subscription<'a, T: 'static + Serialize + DeserializeOwned + Send + Clone, V: 'static + ListChange<T> + Send + Clone + Sync>(
	ctx: &'a async_graphql::Context<'a>, table_name: &'a str, filter_json: Option<FilterInput>, opts: Option<GQLSubOpts>,
) -> impl Stream<Item = Result<V, SubError>> + 'a {
	graphlink_rust::db::generic_handlers::subscriptions::handle_generic_gql_collection_subscription::<T, V>(ctx, table_name, filter_json, None, opts).await
}

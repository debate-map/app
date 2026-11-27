// the crate's subscription handlers, plus what the table files still use from here: gql_set_impl! and the GQLSet name
pub use graphlink_rust::db::generic_handlers::subscriptions::*;
pub use graphlink_rust::{ListChange, ListChange as GQLSet, ListChangeCore, ListChangeType};

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

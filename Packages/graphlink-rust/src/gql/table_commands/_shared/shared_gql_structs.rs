use crate::{
	async_graphql::{self, SimpleObject},
	gql_placeholder,
};
use rust_macros::wrap_slow_macros;

wrap_slow_macros! {
	#[derive(SimpleObject, Debug)]
	pub struct GenericResponse {
		#[graphql(name = "_useTypenameFieldInstead")]
		__: String,
	}
	impl GenericResponse {
		pub fn new() -> Self {
			Self { __: gql_placeholder() }
		}
	}
}

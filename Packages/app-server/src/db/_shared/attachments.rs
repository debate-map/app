use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use rust_shared::async_graphql;
use serde::{Serialize, Deserialize};

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TermAttachmentInput")]
pub struct TermAttachment {
	pub id: String,
}

}
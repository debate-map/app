use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use rust_shared::async_graphql;
use rust_shared::utils::type_aliases::JSONValue;
use serde::{Serialize, Deserialize};

use super::attachments_::source_chain::SourceChain;

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "TermAttachmentInput")]
pub struct TermAttachment {
	pub id: String,
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "AttachmentInput")]
pub struct Attachment {
    pub equation: Option<JSONValue>,
    pub references: Option<JSONValue>,
    pub quote: Option<JSONValue>,
    pub media: Option<JSONValue>,
    //pub media: Option<MediaAttachment>,
}

// todo: have Attachment struct use these directly (delayed, since means a change in the graphql api)
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "QuoteAttachmentInput")]
pub struct QuoteAttachment {
	pub content: String,
	pub sourceChains: Vec<SourceChain>,
}
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "EquationAttachmentInput")]
pub struct EquationAttachment {
	pub latex: Option<bool>,
	pub text: String,
	pub isStep: Option<bool>,
	pub explanation: Option<String>,
}
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "MediaAttachmentInput")]
pub struct MediaAttachment {
	pub id: String,
	pub captured: bool, // whether the image/video is claimed to be a capturing of real-world footage
	pub previewWidth: Option<f64>, // used to limit the display-width, eg. to keep a tall-but-skinny image from extending multiple screens down
	pub sourceChains: Vec<SourceChain>,
}
#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "ReferencesAttachmentInput")]
pub struct ReferencesAttachment {
	pub sourceChains: Vec<SourceChain>,
}

}
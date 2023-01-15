use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use rust_shared::async_graphql;
use rust_shared::utils::type_aliases::JSONValue;
use serde::{Serialize, Deserialize};

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

/*#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MediaAttachment {
    pub id: string,
    /// whether the image/video is claimed to be a capturing of real-world footage
	pub captured: boolean,
    /// used to limit the display-width, eg. to keep a tall-but-skinny image from extending multiple screens down
	pub previewWidth: Option<f64>,
	pub sourceChains: SourceChain[],
}*/

}
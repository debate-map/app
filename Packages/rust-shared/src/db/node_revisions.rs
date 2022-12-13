use async_graphql::{ID, SimpleObject, InputObject};
use serde::{Serialize, Deserialize};
use tokio_postgres::Row;
use rust_macros::wrap_slow_macros;

use crate as rust_shared;
use crate::utils::type_aliases::JSONValue;

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "AttachmentT0")] // temp
pub struct Attachment {
    pub equation: Option<JSONValue>,
    pub references: Option<JSONValue>,
    pub quote: Option<JSONValue>,
    pub media: Option<JSONValue>,
    //pub media: Option<MediaAttachment>,
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
pub struct NodeRevision {
    pub id: ID,
    pub node: String,
    pub replacedBy: Option<String>, 
    pub creator: String,
    pub createdAt: i64,
    pub phrasing: JSONValue,
    #[graphql(name = "phrasing_tsvector")]
    #[serde(skip_serializing)] // makes-so when serializing the struct for saving to the db, this field is excluded (as it must be, since it's auto-generated)
    pub phrasing_tsvector: String,
    pub note: Option<String>,
    pub displayDetails: Option<JSONValue>,
    pub attachments: Vec<Attachment>,
    //pub attachments: Vec<JSONValue>,
}
impl From<Row> for NodeRevision {
    fn from(row: Row) -> Self {
        Self {
            id: ID::from(&row.get::<_, String>("id")),
            node: row.get("node"),
            replacedBy: row.get("replacedBy"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            phrasing: row.get("phrasing"),
            //phrasing_tsvector: row.get("phrasing_tsvector"),
            //phrasing_tsvector: serde_json::from_value(row.get("phrasing_tsvector")).unwrap(),
            phrasing_tsvector: "n/a".to_owned(), // don't know how to convert tsvector into string (it's fine atm, since client doesn't need it anyway)
            note: row.get("note"),
            displayDetails: row.get("displayDetails"),
            /*equation: row.get("equation"),
            references: row.get("references"),
            quote: row.get("quote"),
            media: row.get("media"),*/
            attachments: serde_json::from_value(row.get("attachments")).unwrap(),
        }
    }
}

}
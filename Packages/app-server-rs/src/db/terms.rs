use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(Clone)]
pub struct Term {
    id: ID,
    accessPolicy: String,
	creator: String,
	createdAt: i64,
    name: String,
	forms: Vec<String>,
    disambiguation: Option<String>,
    r#type: String,
    definition: String,
    note: Option<String>,
    attachments: Vec<serde_json::Value>,
}
#[Object]
impl Term {
    async fn id(&self) -> &str { &self.id }
    async fn accessPolicy(&self) -> &str { &self.accessPolicy }
    async fn creator(&self) -> &str { &self.creator }
    async fn createdAt(&self) -> &i64 { &self.createdAt }
    async fn name(&self) -> &str { &self.name }
    async fn forms(&self) -> &Vec<String> { &self.forms }
    async fn disambiguation(&self) -> &Option<String> { &self.disambiguation }
    async fn r#type(&self) -> &str { &self.r#type }
    async fn definition(&self) -> &str { &self.definition }
    async fn note(&self) -> &Option<String> { &self.note }
    async fn attachments(&self) -> &Vec<serde_json::Value> { &self.attachments }
}
impl From<tokio_postgres::row::Row> for Term {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            accessPolicy: row.get("accessPolicy"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            forms: row.get("forms"),
            disambiguation: row.get("disambiguation"),
            r#type: row.get("type"),
            definition: row.get("definition"),
            note: row.get("note"),
            attachments: serde_json::from_value(row.get("attachments")).unwrap(),
		}
	}
}

pub struct GQLSet_Term<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_Term<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_Term;
#[Subscription]
impl SubscriptionShard_Term {
    async fn terms(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_Term<Term>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"terms\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"terms\";", &[]).await.unwrap(),
        };
        let entries: Vec<Term> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_Term {
                nodes: entries, 
            }
        })
    }
    async fn term(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<Term>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.terms(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}
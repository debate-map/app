use std::error::Error;
use anyhow::bail;
use async_graphql::{Result, async_stream::stream, Context, OutputType, Object};
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use serde_json::json;
use tokio_postgres::{Client, Row};

// temp (these will not be useful once the streams are live/auto-update)
pub async fn get_first_item_from_stream_in_result_in_future<T, U: std::fmt::Debug>(result: impl Future<Output = Result<impl Stream<Item = T>, U>>) -> T {
    let stream = result.await.unwrap();
    get_first_item_from_stream(stream).await
}
pub async fn get_first_item_from_stream<T>(stream: impl Stream<Item = T>) -> T {
    let first_item = stream.collect::<Vec<T>>().await.pop().unwrap();
    first_item
}

pub fn get_sql_for_filters(filter: &Option<serde_json::Value>) -> Result<String, anyhow::Error> {
    if filter.is_none() { return Ok("".to_owned()); }
    let filter = filter.as_ref().unwrap();

    let mut parts: Vec<String> = vec![];
    // todo: replace this code-block with one that is safe (ie. uses escaping and such)
    for (prop_name, prop_filters) in filter.as_object().unwrap() {
        //if let Some((filter_type, filter_value)) = prop_filters.as_object().unwrap().iter().next() {
        for (filter_type, filter_value) in prop_filters.as_object().unwrap() {
            parts.push(match filter_type.as_str() {
                "equalTo" => format!("\"{prop_name}\" = {}", filter_value.to_string().replace("\"", "'")),
                "in" => format!("\"{prop_name}\" IN {}", filter_value.to_string().replace("\"", "'").replace("[", "(").replace("]", ")")),
                // see: https://stackoverflow.com/a/54069718
                //"contains" => format!("ANY(\"{prop_name}\") = {}", filter_value.to_string().replace("\"", "'")),
                "contains" => format!("\"{prop_name}\" @> {}", "'{".to_owned() + &filter_value.to_string() + "}'"),
                //"contains_jsonb" => format!("\"{prop_name}\" @> {filter_value_as_jsonb_str}"),
                _ => bail!(r#"Invalid filter-type "{filter_type}" specified. Supported: equalTo, in, contains."#),
            });
        }
    }
    let result = "(".to_owned() + &parts.join(") AND (") + ")";
    Ok(result)
}

/*pub struct GQLSet<T> { pub nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/

//#[async_trait]
pub trait GQLSet<T> {
    fn from(entries: Vec<T>) -> Self;
    //async fn nodes(&self) -> &Vec<T>;
    fn nodes(&self) -> &Vec<T>;
}

pub async fn get_entries_in_collection<T: From<Row>>(ctx: &Context<'_>, collection_name: &str, filter: Option<serde_json::Value>) -> Vec<T> {
    let client = ctx.data::<Client>().unwrap();

    let filters_sql = match get_sql_for_filters(&filter) {
        Ok(a) => a,
        //Err(err) => return stream::once(async { err }),
        Err(err) => panic!("Got error while applying filters:{err}"),
    };
    let where_clause = match filters_sql.len() {
        0..=2 => "".to_owned(),
        _ => " WHERE ".to_owned() + &filters_sql,
    };
    println!("Running where clause:{where_clause} @filter:{filter:?}");
    let rows = client.query(&format!("SELECT * FROM \"{collection_name}\"{where_clause};"), &[]).await.unwrap();
    let entries: Vec<T> = rows.into_iter().map(|r| r.into()).collect();
    entries
}
pub async fn handle_generic_gql_collection_request<T: From<Row>, GQLSetVariant: GQLSet<T>>(ctx: &Context<'_>, collection_name: &str, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSetVariant> {
    let entries: Vec<T> = get_entries_in_collection::<T>(ctx, collection_name, filter).await;
    stream::once(async {
        GQLSetVariant::from(entries)
    })
}
pub async fn handle_generic_gql_doc_request<T: From<Row>, GQLSetVariant: GQLSet<T>>(ctx: &Context<'_>, collection_name: &str, id: &str) -> impl Stream<Item = Option<T>> {
    let mut entries: Vec<T> = get_entries_in_collection::<T>(ctx, collection_name, Some(json!({"id": {"equalTo": id}}))).await;
    let entry = entries.pop();
    stream::once(async { entry })
}
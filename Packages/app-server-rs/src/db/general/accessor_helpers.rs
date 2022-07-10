use futures_util::TryStreamExt;
use serde::Serialize;
use tokio_postgres::Row;
use anyhow::{anyhow, Error};
use deadpool_postgres::{Transaction, Pool};

use crate::utils::{db::{sql_fragment::SQLFragment, filter::{FilterInput, QueryFilter}, queries::get_entries_in_collection_basic}, general::{general::to_anyhow, data_anchor::{DataAnchor, DataAnchorFor1}}, type_aliases::PGClientObject};

pub async fn get_client<'a>(ctx: &async_graphql::Context<'_>) -> Result<PGClientObject, Error> {
    let pool = ctx.data::<Pool>().unwrap();
    Ok(pool.get().await.unwrap())
}
pub async fn start_transaction<'a>(anchor: &'a mut DataAnchorFor1<PGClientObject>, ctx: &async_graphql::Context<'_>) -> Result<Transaction<'a>, Error> {
    // get client, then store it in anchor object the caller gave us a mut-ref to
    *anchor = DataAnchor::holding1(get_client(ctx).await?);
    // now retrieve client from storage-slot we assigned to in the previous line
    let client = anchor.val1.as_mut().unwrap();
    
    let tx = client.build_transaction()
        //.isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;
        // use with serializable+deferrable+readonly, so that the transaction is guaranteed to not fail (see doc for "deferrable") [there may be a better way] 
        .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true).read_only(true)
        .start().await?;
    Ok(tx)
}

pub struct AccessorContext<'a> {
    pub tx: Transaction<'a>,
}
impl<'a> AccessorContext<'a> {
    pub fn new(tx: Transaction<'a>) -> Self {
        Self {
            tx
        }
    }
}

pub async fn get_db_entry<'a, T: From<Row> + Serialize>(ctx: &AccessorContext<'a>, table_name: &str, filter_json: &Option<FilterInput>) -> Result<T, Error> {
    let entries = get_db_entries(ctx, table_name, filter_json).await?;
    let entry = entries.into_iter().nth(0);
    let result = entry.ok_or(anyhow!(r#"No entries found in table "{table_name}" matching filter:{filter_json:?}"#))?;
    Ok(result)
}
pub async fn get_db_entries<'a, T: From<Row> + Serialize>(ctx: &AccessorContext<'a>, table_name: &str, filter_json: &Option<FilterInput>) -> Result<Vec<T>, Error> {
    let query_func = |mut sql: SQLFragment| async move {
        let (sql_text, params) = sql.into_query_args()?;
        
        /*let temp1: Vec<Box<dyn ToSql + Sync>> = params.into_iter().map(strip_send_from_tosql_sync_send).collect();
        let temp2: Vec<&(dyn ToSql + Sync)> = temp1.iter().map(|a| a.as_ref()).collect();
        //ctx.tx.query(&sql_text, temp2.as_slice()).await
        ctx.tx.query_raw(&sql_text, temp2.as_slice()).await*/

        /*//let temp2 = temp1.iter().map(|a| a.as_ref());
        let stream = ctx.tx.query_raw(&sql_text, params.iter()).await?;
        Ok(stream.filter_map(|a| async move {
            match a {
                Ok(a) => Some(a),
                Err(err) => None,
            }
        }).collect::<Vec<_>>().await)*/

        // query_raw supposedly allows dynamically-constructed params-vecs, but the only way I've been able to get it working is by locking the vector to a single concrete type
        // see here: https://github.com/sfackler/rust-postgres/issues/445#issuecomment-1086774095
        //let params: Vec<String> = params.into_iter().map(|a| a.as_ref().to_string()).collect();
        ctx.tx.query_raw(&sql_text, params).await.map_err(to_anyhow)?
            .try_collect().await.map_err(to_anyhow)
    };

    let filter = QueryFilter::from_filter_input_opt(filter_json)?;
    let (_entries, entries_as_type) = get_entries_in_collection_basic(query_func, table_name.to_owned(), &filter, None).await?; // pass no mtx, because we don't care about optimizing the "subtree" endpoint atm
    Ok(entries_as_type)
}

/*#[derive(Serialize, Deserialize)]
struct MapNodeL3 {
    // todo
}
pub async fn get_node_l3(ctx: &AccessorContext<'_>, path: String) -> Option<MapNodeL3> {
    let id = path.split("/").last();
    let node: Option<MapNode> = get_db_entry(ctx, "nodes", &Some(json!({
        "id": {"equalTo": id}
    }))).await;

    let node_l3: MapNodeL3 = node;
    Some(node_l3)
}*/
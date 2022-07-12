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
pub async fn start_read_transaction<'a>(anchor: &'a mut DataAnchorFor1<PGClientObject>, ctx: &async_graphql::Context<'_>) -> Result<Transaction<'a>, Error> {
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
pub async fn start_write_transaction<'a>(anchor: &'a mut DataAnchorFor1<PGClientObject>, ctx: &async_graphql::Context<'_>) -> Result<Transaction<'a>, Error> {
    // get client, then store it in anchor object the caller gave us a mut-ref to
    *anchor = DataAnchor::holding1(get_client(ctx).await?);
    // now retrieve client from storage-slot we assigned to in the previous line
    let client = anchor.val1.as_mut().unwrap();
    
    let tx = client.build_transaction()
        .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true) // todo: confirm whether this should be deferrable:true or not
        .start().await?;
    Ok(tx)
}
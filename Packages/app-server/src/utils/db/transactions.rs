use futures_util::TryStreamExt;
use rust_shared::async_graphql;
use rust_shared::serde::Serialize;
use rust_shared::{tokio_postgres, tokio_postgres::Row};
use rust_shared::anyhow::{anyhow, Error};
use deadpool_postgres::{Transaction, Pool};

use crate::store::storage::get_app_state_from_gql_ctx;
use crate::utils::type_aliases::DBPool;
use crate::utils::{db::{sql_fragment::SQLFragment, filter::{FilterInput, QueryFilter}, queries::get_entries_in_collection_base}, general::{data_anchor::{DataAnchor, DataAnchorFor1}}, type_aliases::PGClientObject};

pub async fn get_client_from_gql_ctx<'a>(ctx: &async_graphql::Context<'_>) -> Result<PGClientObject, Error> {
    let pool = &get_app_state_from_gql_ctx(ctx).db_pool;
    Ok(pool.get().await.unwrap())
}
pub async fn start_read_transaction<'a>(anchor: &'a mut DataAnchorFor1<PGClientObject>, db_pool: &DBPool) -> Result<Transaction<'a>, Error> {
    // get client, then store it in anchor object the caller gave us a mut-ref to
    *anchor = DataAnchor::holding1(db_pool.get().await?);
    // now retrieve client from storage-slot we assigned to in the previous line
    let client = anchor.val1.as_mut().unwrap();
    
    let tx = client.build_transaction()
        //.isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;
        // use with serializable+deferrable+readonly, so that the transaction is guaranteed to not fail (see doc for "deferrable") [there may be a better way] 
        .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true).read_only(true)
        .start().await?;
    Ok(tx)
}
pub async fn start_write_transaction<'a>(anchor: &'a mut DataAnchorFor1<PGClientObject>, db_pool: &DBPool) -> Result<Transaction<'a>, Error> {
    // get client, then store it in anchor object the caller gave us a mut-ref to
    *anchor = DataAnchor::holding1(db_pool.get().await?);
    // now retrieve client from storage-slot we assigned to in the previous line
    let client = anchor.val1.as_mut().unwrap();
    
    let tx = client.build_transaction()
        .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true) // todo: confirm whether this should be deferrable:true or not
        .start().await?;
    Ok(tx)
}
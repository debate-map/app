use futures_util::TryStreamExt;
use rust_shared::async_graphql;
use rust_shared::serde::Serialize;
use rust_shared::tokio_postgres::{Row, types::ToSql};
use rust_shared::anyhow::{anyhow, Error};
use deadpool_postgres::{Transaction, Pool};
use rust_shared::utils::auth::jwt_utils_base::UserJWTData;
use rust_shared::utils::general_::extensions::ToOwnedV;

use crate::db::general::sign_in_::jwt_utils::get_user_jwt_data_from_gql_ctx;
use crate::store::storage::get_app_state_from_gql_ctx;
use crate::utils::type_aliases::DBPool;
use crate::{utils::{db::{sql_fragment::SQLFragment, filter::{FilterInput, QueryFilter}, queries::get_entries_in_collection_basic}, general::{data_anchor::{DataAnchor, DataAnchorFor1}}, type_aliases::PGClientObject}, db::commands::_command::ToSqlWrapper};

use super::transactions::{start_read_transaction, start_write_transaction};

/// Helper function to defer constraints in a database transaction.
/// This is generally used to avoid foreign-key constraint violations, when multiple rows (linked with each other through foreign-key constraints) are being updated within the same command/transaction.
pub async fn defer_constraints(tx: &Transaction<'_>) -> Result<(), Error>{
    tx.execute("SET CONSTRAINTS ALL DEFERRED", &[]).await?;
    Ok(())
}
pub async fn trigger_deferred_constraints(tx: &Transaction<'_>) -> Result<(), Error>{
    // this triggers previously-deferred constraints to be checked immediately (see: https://www.postgresql.org/docs/current/sql-set-constraints.html)
    tx.execute("SET CONSTRAINTS ALL IMMEDIATE", &[]).await?;
    Ok(())
}

pub struct AccessorContext<'a> {
    pub tx: Transaction<'a>,
    pub only_validate: bool,
}
impl<'a> AccessorContext<'a> {
    // base
    pub fn new_raw(tx: Transaction<'a>, only_validate: bool) -> Self {
        Self { tx, only_validate }
    }

    // low-level
    pub async fn new_read_base(anchor: &'a mut DataAnchorFor1<PGClientObject>, db_pool: &DBPool, user: Option<UserJWTData>, bypass_rls: bool) -> Result<AccessorContext<'a>, Error> {
        let tx = start_read_transaction(anchor, db_pool).await?;

        // if bypass_rls is false, then enforce rls-policies (for this transaction) by switching to the "rls_obeyer" role
        if !bypass_rls {
            tx.execute("SET ROLE rls_obeyer", &[]).await?;
            tx.execute("SELECT set_config('app.current_user_id', $1, true)", &[&user.map(|a| a.id).unwrap_or("<none>".o())]).await?;
            /*let user_is_admin = TODO;
            tx.execute("SELECT set_config('app.current_user_admin', $1, true)", &[&user_is_admin]).await?;*/
        }
        
        Ok(Self { tx, only_validate: false })
    }
    pub async fn new_write_base(anchor: &'a mut DataAnchorFor1<PGClientObject>, db_pool: &DBPool, user: Option<UserJWTData>, bypass_rls: bool) -> Result<AccessorContext<'a>, Error> {
        Self::new_write_advanced_base(anchor, db_pool, user, bypass_rls, Some(false)).await
    }
    pub async fn new_write_advanced_base(anchor: &'a mut DataAnchorFor1<PGClientObject>, db_pool: &DBPool, user: Option<UserJWTData>, bypass_rls: bool, only_validate: Option<bool>) -> Result<AccessorContext<'a>, Error> {
        let tx = start_write_transaction(anchor, db_pool).await?;
        let only_validate = only_validate.unwrap_or(false);

        // Some commands (eg. deleteNode) need foreign-key contraint-deferring till end of transaction, so just do so always.
        // This is safer, since it protects against "forgotten deferral" in commands where an fk-constraint is *temporarily violated* -- but only in an "uncommon conditional branch".
        // (Deferring always is not much of a negative anyway; instant constraint-checking doesn't improve debugging much in this context, since fk-violations are generally easy to identify once triggered.)
		defer_constraints(&tx).await?;

        // if bypass_rls is false, then enforce rls-policies (for this transaction) by switching to the "rls_obeyer" role
        if !bypass_rls {
            tx.execute("SET ROLE rls_obeyer", &[]).await?;
            tx.execute("SELECT set_config('app.current_user_id', $1, true)", &[&user.map(|a| a.id).unwrap_or("<none>".o())]).await?;
        }

        Ok(Self { tx, only_validate })
    }

    // high-level
    pub async fn new_read(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: &async_graphql::Context<'_>, bypass_rls: bool) -> Result<AccessorContext<'a>, Error> {
        Ok(Self::new_read_base(anchor, &get_app_state_from_gql_ctx(gql_ctx).db_pool, Some(get_user_jwt_data_from_gql_ctx(gql_ctx).await?), bypass_rls).await?)
    }
    pub async fn new_write(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: &async_graphql::Context<'_>, bypass_rls: bool) -> Result<AccessorContext<'a>, Error> {
        Ok(Self::new_write_base(anchor, &get_app_state_from_gql_ctx(gql_ctx).db_pool, Some(get_user_jwt_data_from_gql_ctx(gql_ctx).await?), bypass_rls).await?)
    }
    pub async fn new_write_advanced(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: &async_graphql::Context<'_>, bypass_rls: bool, only_validate: Option<bool>) -> Result<AccessorContext<'a>, Error> {
        Ok(Self::new_write_advanced_base(anchor, &get_app_state_from_gql_ctx(gql_ctx).db_pool, Some(get_user_jwt_data_from_gql_ctx(gql_ctx).await?), bypass_rls, only_validate).await?)
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

        let debug_info_str = format!("@sqlText:{}\n@params:{:?}", &sql_text, &params);

        let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
        let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

        // query_raw supposedly allows dynamically-constructed params-vecs, but the only way I've been able to get it working is by locking the vector to a single concrete type
        // see here: https://github.com/sfackler/rust-postgres/issues/445#issuecomment-1086774095
        //let params: Vec<String> = params.into_iter().map(|a| a.as_ref().to_string()).collect();
        ctx.tx.query_raw(&sql_text, params_as_refs).await
            .map_err(|err| {
                anyhow!("Got error while running query, for getting db-entries. @error:{}\n{}", err.to_string(), &debug_info_str)
            })?
            .try_collect().await.map_err(|err| {
                anyhow!("Got error while collecting results of db-query, for getting db-entries. @error:{}\n{}", err.to_string(), &debug_info_str)
            })
    };

    let filter = QueryFilter::from_filter_input_opt(filter_json)?;
    let (_entries, entries_as_type) = get_entries_in_collection_basic(query_func, table_name.to_owned(), &filter, None).await?; // pass no mtx, because we don't care about optimizing the "subtree" endpoint atm
    Ok(entries_as_type)
}

/*#[derive(Serialize, Deserialize)]
struct NodeL3 {
    // todo
}
pub async fn get_node_l3(ctx: &AccessorContext<'_>, path: String) -> Option<NodeL3> {
    let id = path.split("/").last();
    let node: Option<Node> = get_db_entry(ctx, "nodes", &Some(json!({
        "id": {"equalTo": id}
    }))).await;

    let node_l3: NodeL3 = node;
    Some(node_l3)
}*/
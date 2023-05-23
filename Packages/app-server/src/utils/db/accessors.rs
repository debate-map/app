use std::sync::atomic::{AtomicBool, Ordering};

use futures_util::{TryStreamExt, Future};
use rust_shared::async_graphql;
use rust_shared::serde::Serialize;
use rust_shared::tokio_postgres::{Row, types::ToSql};
use rust_shared::anyhow::{anyhow, Error, ensure, bail};
use deadpool_postgres::{Transaction, Pool};
use rust_shared::utils::auth::jwt_utils_base::UserJWTData;
use rust_shared::utils::general_::extensions::ToOwnedV;
use tracing::error;

use crate::db::general::sign_in_::jwt_utils::{get_user_jwt_data_from_gql_ctx, try_get_user_jwt_data_from_gql_ctx};
use crate::store::storage::get_app_state_from_gql_ctx;
use crate::utils::type_aliases::DBPool;
use crate::{utils::{db::{sql_fragment::SQLFragment, filter::{FilterInput, QueryFilter}, queries::get_entries_in_collection_base}, general::{data_anchor::{DataAnchor, DataAnchorFor1}}, type_aliases::PGClientObject}, db::commands::_command::ToSqlWrapper};

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
    pub gql_ctx: Option<&'a async_graphql::Context<'a>>,
    pub tx: Transaction<'a>,
    pub only_validate: bool,
    rls_enabled: AtomicBool,
}
impl<'a> AccessorContext<'a> {
    // base constructor
    pub fn new_raw(gql_ctx: Option<&'a async_graphql::Context<'a>>, tx: Transaction<'a>, only_validate: bool, rls_enabled: bool) -> Self {
        Self { gql_ctx, tx, only_validate, rls_enabled: AtomicBool::new(rls_enabled) }
    }

    // low-level constructors
    pub async fn new_read_base(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: Option<&'a async_graphql::Context<'a>>, db_pool: &DBPool, user: Option<UserJWTData>, bypass_rls: bool) -> Result<AccessorContext<'a>, Error> {
        let tx = start_read_transaction(anchor, db_pool).await?;
        tx.execute("SELECT set_config('app.current_user_id', $1, true)", &[&user.map(|a| a.id).unwrap_or("<none>".o())]).await?;
        /*let user_is_admin = TODO;
        tx.execute("SELECT set_config('app.current_user_admin', $1, true)", &[&user_is_admin]).await?;*/
        let new_self = Self { gql_ctx, tx, only_validate: false, rls_enabled: AtomicBool::new(false) }; // rls not enabled quite yet; we'll do that in a moment

        // if bypass_rls is false, then enforce rls-policies (for this transaction) by switching to the "rls_obeyer" role
        if !bypass_rls {
            new_self.enable_rls().await?;
        }

        Ok(new_self)
    }
    pub async fn new_write_base(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: Option<&'a async_graphql::Context<'a>>, db_pool: &DBPool, user: Option<UserJWTData>, bypass_rls: bool) -> Result<AccessorContext<'a>, Error> {
        Self::new_write_advanced_base(anchor, gql_ctx, db_pool, user, bypass_rls, Some(false)).await
    }
    pub async fn new_write_advanced_base(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: Option<&'a async_graphql::Context<'a>>, db_pool: &DBPool, user: Option<UserJWTData>, bypass_rls: bool, only_validate: Option<bool>) -> Result<AccessorContext<'a>, Error> {
        if !bypass_rls {
            match &user {
                None => bail!("Cannot create write transaction without a user JWT (ie. auth-data) supplied."),
                Some(jwt_data) => {
                    let jwt_read_only = jwt_data.readOnly.unwrap_or(false);
                    ensure!(!jwt_read_only, "Cannot create write transaction using a read-only JWT.");
                },
            }
        }
        
        let tx = start_write_transaction(anchor, db_pool).await?;
        tx.execute("SELECT set_config('app.current_user_id', $1, true)", &[&user.map(|a| a.id).unwrap_or("<none>".o())]).await?;
        let only_validate = only_validate.unwrap_or(false);
        let new_self = Self { gql_ctx, tx, only_validate, rls_enabled: AtomicBool::new(false) }; // rls not enabled quite yet; we'll do that in a moment

        // Some commands (eg. deleteNode) need foreign-key contraint-deferring till end of transaction, so just do so always.
        // This is safer, since it protects against "forgotten deferral" in commands where an fk-constraint is *temporarily violated* -- but only in an "uncommon conditional branch".
        // (Deferring always is not much of a negative anyway; instant constraint-checking doesn't improve debugging much in this context, since fk-violations are generally easy to identify once triggered.)
		defer_constraints(&new_self.tx).await?;

        // if bypass_rls is false, then enforce rls-policies (for this transaction) by switching to the "rls_obeyer" role
        if !bypass_rls {
            new_self.enable_rls().await?;
        }

        Ok(new_self)
    }

    // high-level constructors
    pub async fn new_read(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: &'a async_graphql::Context<'a>, bypass_rls: bool) -> Result<AccessorContext<'a>, Error> {
        Ok(Self::new_read_base(anchor, Some(gql_ctx), &get_app_state_from_gql_ctx(gql_ctx).db_pool, try_get_user_jwt_data_from_gql_ctx(gql_ctx).await?, bypass_rls).await?)
    }
    pub async fn new_write(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: &'a async_graphql::Context<'a>, bypass_rls: bool) -> Result<AccessorContext<'a>, Error> {
        Ok(Self::new_write_base(anchor, Some(gql_ctx), &get_app_state_from_gql_ctx(gql_ctx).db_pool, try_get_user_jwt_data_from_gql_ctx(gql_ctx).await?, bypass_rls).await?)
    }
    pub async fn new_write_advanced(anchor: &'a mut DataAnchorFor1<PGClientObject>, gql_ctx: &'a async_graphql::Context<'a>, bypass_rls: bool, only_validate: Option<bool>) -> Result<AccessorContext<'a>, Error> {
        Ok(Self::new_write_advanced_base(anchor, Some(gql_ctx), &get_app_state_from_gql_ctx(gql_ctx).db_pool, try_get_user_jwt_data_from_gql_ctx(gql_ctx).await?, bypass_rls, only_validate).await?)
    }

    // other methods
    pub async fn enable_rls(&self) -> Result<(), Error> {
        ensure!(!self.rls_enabled.load(Ordering::SeqCst), "RLS is already enabled. Since our current usages are simple, this is unexpected, and thus considered an error.");
        self.rls_enabled.store(true, Ordering::SeqCst);

        self.tx.execute("SET LOCAL ROLE rls_obeyer", &[]).await?;
        /*self.tx.execute("SET LOCAL ROLE rls_obeyer", &[]).await?.map_err(|err| {
            // if we hit an error while trying to re-enable RLS, then just kill the pg-pool connection (defensive programming vs tricks/exploits)
            self.tx.client().__private_api_close();
            err
        })?);*/
        Ok(())
    }
    pub async fn disable_rls(&self) -> Result<(), Error> {
        ensure!(self.rls_enabled.load(Ordering::SeqCst), "RLS is already disabled. Since our current usages are simple, this is unexpected, and thus considered an error.");
        self.rls_enabled.store(false, Ordering::SeqCst);

        self.tx.execute("RESET ROLE", &[]).await?;
        Ok(())
    }
    pub async fn with_rls_disabled<Fut: Future<Output = Result<(), Error>>>(&self, f: impl FnOnce() -> Fut, simple_err_for_client: Option<&str>) -> Result<(), Error> {
        self.disable_rls().await?;
        let result = f().await;
        self.enable_rls().await?;
        match simple_err_for_client {
            None => result,
            Some(simple_err_for_client) => result.map_err(|err| {
                // log full error to app-server log, but return a generic error to client (we generally don't want data from rls-disabled block to be leaked to client)
                error!("{} @fullError:{:?}", simple_err_for_client, err);
                anyhow!("{}", simple_err_for_client)
            }),
        }
    }
}
/*pub struct TxTempAdminUpgradeWrapper<'a> {
    pub ctx: &'a AccessorContext<'a>,
}
impl<'a> Drop for TxTempAdminUpgradeWrapper<'a> {
    fn drop(&mut self) {
        self.ctx.set_tx_role_restricted().await.unwrap();
    }
}*/

pub async fn get_db_entry<'a, T: From<Row> + Serialize>(ctx: &AccessorContext<'a>, table_name: &str, filter_json: &Option<FilterInput>) -> Result<T, Error> {
    let entries = get_db_entries(ctx, table_name, filter_json).await?;
    let entry = entries.into_iter().nth(0);
    let result = entry.ok_or(anyhow!(r#"No entries found in table "{table_name}" matching filter:{filter_json:?}"#))?;
    Ok(result)
}
pub async fn get_db_entries<'a, T: From<Row> + Serialize>(ctx: &AccessorContext<'a>, table_name: &str, filter_json: &Option<FilterInput>) -> Result<Vec<T>, Error> {
    let query_func = |mut sql: SQLFragment| async move {
        let (sql_text, params) = sql.into_query_args()?;
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
    let (_entries, entries_as_type) = get_entries_in_collection_base(query_func, table_name.to_owned(), &filter, None).await?; // pass no mtx, because we don't care about optimizing the "subtree" endpoint atm
    Ok(entries_as_type)
}
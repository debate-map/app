use std::iter::{once, empty};

use rust_shared::async_graphql::{MaybeUndefined, self};
use rust_shared::indoc::indoc;
use rust_shared::itertools::{chain, Itertools};
use rust_shared::utils::general_::extensions::IteratorV;
use rust_shared::utils::type_aliases::{JSONValue, RowData};
use rust_shared::{bytes, serde_json};
use rust_shared::serde::Serialize;
use async_trait::async_trait;
use futures_util::{TryStreamExt, Future};
use rust_shared::serde_json::json;
use rust_shared::{tokio_postgres, tokio_postgres::{Row, types::ToSql}};
use rust_shared::anyhow::{anyhow, Error, Context};
use deadpool_postgres::{Transaction, Pool};

use crate::db::users::User;
use crate::utils::db::sql_param::{SQLParamBoxed};
use crate::utils::{db::{sql_fragment::{SQLFragment, SF}, filter::{json_value_to_guessed_sql_value_param_fragment}, accessors::AccessorContext, sql_ident::SQLIdent, sql_param::{SQLParam, CustomPGSerializer}}, general::{general::{match_cond_to_iter}}};

/*pub struct UserInfo {
    pub id: String,
}

#[async_trait(?Send)]
pub trait Command {
    async fn Validate(&self, ctx: &AccessorContext<'_>) -> Result<JSONValue, Error>;
    fn Commit(&self, ctx: &AccessorContext<'_>) -> Result<(), Error>;
}*/

// command helpers
// ==========

//pub fn db_set<T: AsRef<str>, T2: Serialize>(ctx: &AccessorContext<'_>, path: &[T], value: T2) {}

/*pub async fn set_db_entry_by_id(ctx: &AccessorContext<'_>, table_name: String, id: String, new_row: RowData) -> Result<Vec<Row>, Error> {
    set_db_entry_by_filter(ctx, table_name, json!({
        "id": {"equalTo": id}
    }), new_row).await
}
pub async fn set_db_entry_by_filter(ctx: &AccessorContext<'_>, table_name: String, filter_json: FilterInput, new_row: RowData) -> Result<Vec<Row>, Error> {
    let filter = QueryFilter::from_filter_input_opt(&Some(filter_json))?;
    let filters_sql = filter.get_sql_for_application().with_context(|| format!("Got error while getting sql for filter:{filter:?}"))?;
    //let filters_sql_str = filters_sql.to_string(); // workaround for difficulty implementing Clone for SQLFragment ()
    let where_sql = SF::merge(vec![
        SF::lit(" WHERE "),
        filters_sql
    ]);
    [...]
}*/

pub fn to_row_data(data: impl Serialize) -> Result<RowData, Error> {
    let as_json = serde_json::to_value(data)?;
    let as_map = as_json.as_object().ok_or(anyhow!("The passed data did not serialize to a json object/map!"))?;
    Ok(as_map.to_owned())
}
pub async fn set_db_entry_by_id_for_struct<T: Serialize>(ctx: &AccessorContext<'_>, table_name: String, id: String, new_row_struct: T) -> Result<Vec<Row>, Error> {
    let struct_as_row_data = to_row_data(new_row_struct)?;
    set_db_entry_by_id(ctx, table_name, id, struct_as_row_data).await
}
pub async fn set_db_entry_by_id(ctx: &AccessorContext<'_>, table_name: String, id: String, new_row: RowData) -> Result<Vec<Row>, Error> {
    // todo: maybe remove this (it's not really necessary to pass the id in separately from the row-data)
    let id_from_row_data = new_row.get("id").ok_or(anyhow!("No \"id\" field in entry!"))?
        .as_str().ok_or(anyhow!("The \"id\" field in entry was not a string!"))?;
    if id_from_row_data != id.as_str() {
        return Err(anyhow!("ID passed to set_db_entry_by_id does not match the id present in the data structure."));
    }
    
    let mut final_query = SF::merge_lines(chain!(
        chain!(
            SF::new("INSERT INTO $I (", vec![SQLIdent::new_boxed(table_name.clone())?]).once(),
            new_row.iter().enumerate().map(|(i, key_and_val)| -> Result<SQLFragment, Error> {
                Ok(SF::merge(chain!(
                    match_cond_to_iter(i > 0, SF::lit(", ").once(), empty()),
                    Some(SF::ident(SQLIdent::new(key_and_val.0.to_owned())?)),
                ).collect_vec()))
            }).try_collect2::<Vec<_>>()?,
            SF::lit(")").once()
        ),
        chain!(
            SF::lit("VALUES(").once(),
            new_row.iter().enumerate().map(|(i, key_and_val)| -> Result<SQLFragment, Error> {
                Ok(SF::merge(chain!(
                    match_cond_to_iter(i > 0, SF::lit(", ").once(), empty()),
                    //Some(SF::value(key_and_val.1.to_owned())),
                    Some({
                        // temp; hard-code the correct type for fields that the guesser guesses wrong (this system really needs cleanup to avoid this ugly hack...)
                        if table_name == "maps" && key_and_val.0 == "editors" {
                            let as_array = key_and_val.1.as_array().unwrap().clone();
                            let as_array_of_strings = as_array.iter().map(|a| a.as_str().unwrap().to_owned()).collect_vec();
                            SF::value(CustomPGSerializer::new("::text[]".to_owned(), as_array_of_strings))
                        } else if table_name == "nodePhrasings" && key_and_val.0 == "references" {
                            let as_array = key_and_val.1.as_array().unwrap().clone();
                            let as_array_of_strings = as_array.iter().map(|a| a.as_str().unwrap().to_owned()).collect_vec();
                            SF::value(CustomPGSerializer::new("::text[]".to_owned(), as_array_of_strings))
                        } else if table_name == "nodePhrasings" && key_and_val.0 == "terms" {
                            let as_array = key_and_val.1.as_array().unwrap().clone();
                            SF::value(CustomPGSerializer::new("::jsonb[]".to_owned(), as_array))
                        } else {
                            json_value_to_guessed_sql_value_param_fragment(key_and_val.1)?
                        }
                    })
                ).collect_vec()))
            }).try_collect2::<Vec<_>>()?,
            SF::lit(")").once(),
        ),
        SF::lit("ON CONFLICT (id) DO UPDATE SET").once(),
        new_row.iter().filter(|key_and_val| key_and_val.0 != "id").enumerate().map(|(i, key_and_val)| -> Result<SQLFragment, Error> {
            Ok(SF::merge(chain!(
                match_cond_to_iter(i > 0, SF::lit(", ").once(), empty()),
                Some(SF::ident(SQLIdent::new(key_and_val.0.to_owned())?)),
                SF::lit(" = EXCLUDED.").once(),
                Some(SF::ident(SQLIdent::new(key_and_val.0.to_owned())?)),
            ).collect_vec()))
        }).try_collect2::<Vec<_>>()?,
    ).collect_vec());
    let (sql_text, params) = final_query.into_query_args()?;

    let debug_info_str = format!("@sqlText:{}\n@params:{:?}", &sql_text, &params);
    // wrap params into boxes, then refs, to satisfy ToSql constraint generically; not ideal, but best approach known atm; see: https://github.com/sfackler/rust-postgres/issues/712
    let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
    let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

    let rows: Vec<Row> = ctx.tx.query_raw(&sql_text, params_as_refs).await
        .map_err(|err| anyhow!("Got error while running query, for setting db-entry. @error:{}\n{}", err.to_string(), &debug_info_str))?
        .try_collect().await.map_err(|err| anyhow!("Got error while collecting results of db-query, for setting db-entry. @error:{}\n{}", err.to_string(), &debug_info_str))?;
    Ok(rows)
}

pub async fn delete_db_entry_by_id(ctx: &AccessorContext<'_>, table_name: String, id: String) -> Result<Vec<Row>, Error> {
    Ok(delete_db_entry_by_field_value(ctx, table_name, "id".to_owned(), Box::new(id)).await?)
}
pub async fn delete_db_entry_by_field_value(ctx: &AccessorContext<'_>, table_name: String, field_name: String, field_value: SQLParamBoxed) -> Result<Vec<Row>, Error> {
    let mut final_query = SF::new("DELETE FROM $I WHERE $I = $V RETURNING *", vec![
        SQLIdent::new_boxed(table_name.clone())?,
        SQLIdent::new_boxed(field_name.clone())?,
        field_value,
    ]);
    let (sql_text, params) = final_query.into_query_args()?;

    let debug_info_str = format!("@sqlText:{}\n@params:{:?}", &sql_text, &params);
    // wrap params into boxes, then refs, to satisfy ToSql constraint generically; not ideal, but best approach known atm; see: https://github.com/sfackler/rust-postgres/issues/712
    let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
    let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

    let rows: Vec<Row> = ctx.tx.query_raw(&sql_text, params_as_refs).await
        .map_err(|err| anyhow!("Got error while running query, for deleting db-entry. @error:{}\n{}", err.to_string(), &debug_info_str))?
        .try_collect().await.map_err(|err| anyhow!("Got error while collecting results of db-query, for deleting db-entry. @error:{}\n{}", err.to_string(), &debug_info_str))?;
    Ok(rows)
}

#[derive(Debug)]
pub struct ToSqlWrapper {
    pub data: Box<dyn SQLParam>,
}
impl ToSql for ToSqlWrapper {
    fn accepts(_ty: &tokio_postgres::types::Type) -> bool where Self: Sized {
        panic!("Call to_sql_checked instead.");
    }
    fn to_sql(&self, _ty: &tokio_postgres::types::Type, _out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> where Self: Sized {
        panic!("Call to_sql_checked instead.");
    }
    fn to_sql_checked(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        /*let test: dyn SQLParam = *self.data;
        test.to_sql_checked_(ty, out)*/
        self.data.to_sql_checked_(ty, out)
    }
}

/// Use this to fill in the string value for a field that must be set, but whose value will only be known (and set by the server) shortly.
/// This should be used only in cases where more robust approaches would be painful to implement, since it reduces type-safety of the field a bit. (ie. field might now be "set", but left as something invalid)
/// * `func_that_will_provide_value`: Indicates which function will end up setting the value. (used to provide greater clarity)
pub fn tbd(func_that_will_provide_value: &str) -> String {
    format!("<tbd; value will be set by server shortly, in function {func_that_will_provide_value}>")
}

pub fn gql_placeholder() -> String {
    "Do not request this field; it's here transiently merely to satisfy graphql (see: https://github.com/graphql/graphql-spec/issues/568). Instead, request the hidden \"__typename\" field, as that will always exist.".to_owned()
}

pub type FieldUpdate<T> = Option<T>;
pub type FieldUpdate_Nullable<T> = MaybeUndefined<T>;

pub fn update_field<T>(val_in_updates: FieldUpdate<T>, old_val: T) -> T {
    match val_in_updates {
        None => old_val,
        Some(val) => val,
    }
}
pub fn update_field_nullable<T>(val_in_updates: FieldUpdate_Nullable<T>, old_val: Option<T>) -> Option<T> {
    match val_in_updates {
        MaybeUndefined::Undefined => old_val,
        MaybeUndefined::Null => None,
        MaybeUndefined::Value(val) => Some(val),
    }
}

/// Variant of `update_field` for use with the `extras` field of db-structs, allowing easy updating of its data through the standard `update_x` commands, while preserving locked subfields.
pub fn update_field_of_extras(val_in_updates: FieldUpdate<JSONValue>, old_val: JSONValue, locked_subfields: Vec<&str>) -> Result<JSONValue, Error> {
    let mut result = match val_in_updates {
        None => old_val.clone(),
        Some(val) => val,
    };
    
    let old_val_map = old_val.as_object().ok_or(anyhow!("The old-value for the \"extras\" field was not a json map/object!"))?;
    let result_map = result.as_object_mut().ok_or(anyhow!("The final value for the \"extras\" field was somehow not a json map/object!"))?;
    for key in locked_subfields {
        let subfield_old_val = old_val_map.get(key).clone();
        let subfield_new_val = result_map.get(key).clone();
        
        // throw error if user is trying to update the locked subfield
        if format!("{:?}", subfield_old_val) != format!("{:?}", subfield_new_val) {
            return Err(anyhow!("The `extras->{key}` jsonb-subfield cannot be updated from this generic update command; look for a command that deals with updating it specifically. @oldVal:{subfield_old_val:?} @newVal:{subfield_new_val:?}"));
        }

        // in case the stringification above fails to catch a change (eg. flawed Debug implementation), make certain that it doesn't go through, by always resetting the subfield to its old value
        match old_val.get(key) {
            None => result_map.remove(key),
            Some(val) => result_map.insert(key.to_owned(), val.clone()),
        };
    }

    Ok(result)
}

/* Usage example:
```
command_boilerplate_pre!(gql_ctx, input, ctx, user_info);
let result = delete_map(&ctx, input, &user_info).await?;
command_boilerplate_post!(ctx, result);
```*/
/*macro_rules! command_boilerplate_pre {
    ($gql_ctx:ident, $input:ident, $ctx:ident, $user_info:ident) => {
        let mut anchor = $crate::utils::general::data_anchor::DataAnchorFor1::empty(); // holds pg-client
		let $ctx = $crate::utils::db::accessors::AccessorContext::new_write(&mut anchor, $gql_ctx).await?;
		let $user_info = $crate::db::general::sign_in_::jwt_utils::get_user_info_from_gql_ctx(&$gql_ctx, &$ctx).await?;
    }
}
pub(crate) use command_boilerplate_pre;
macro_rules! command_boilerplate_post {
    ($ctx:ident, $result:ident) => {
		$ctx.tx.commit().await?;
		tracing::info!("Command completed! Result:{:?}", $result);
		return Ok($result);
    }
}
pub(crate) use command_boilerplate_post;*/

// Usage example: `command_boilerplate!(gql_ctx, input, only_validate, delete_map);`
macro_rules! command_boilerplate {
    ($gql_ctx:ident, $input:ident, $only_validate:ident, $command_impl_func:ident) => {
        let mut anchor = $crate::utils::general::data_anchor::DataAnchorFor1::empty(); // holds pg-client
		let ctx = $crate::utils::db::accessors::AccessorContext::new_write_advanced(&mut anchor, $gql_ctx, false, $only_validate).await?;
		let actor = $crate::db::general::sign_in_::jwt_utils::get_user_info_from_gql_ctx(&$gql_ctx, &ctx).await?;

		let result = $command_impl_func(&ctx, &actor, $input, Default::default()).await?;

		if $only_validate.unwrap_or(false) {
            // before rolling back, ensure that none of the constraints are violated at this point (we must check manually, since commit is never called)
            $crate::utils::db::accessors::trigger_deferred_constraints(&ctx.tx).await?;
            
            // the transaction would be rolled-back automatically after this blocks ends, but let's call rollback() explicitly just to be clear/certain
            ctx.tx.rollback().await?;
            tracing::info!("Command completed a \"validation only\" run without hitting errors. Result:{:?}", result);
        } else {
            ctx.tx.commit().await?;
            tracing::info!("Command executed. Result:{:?}", result);
        }
		return Ok(result);
    }
}
pub(crate) use command_boilerplate;

pub type NoExtras = bool;

// I couldn't quite get this working (error relating to lifetimes)
// Usage example: `Ok(standard_command(gql_ctx, input, delete_map).await?)`
/*pub async fn standard_command<InputT, ResultT, Fut>(
    gql_ctx: &async_graphql::Context<'_>,
    input: InputT,
    command_impl_func: impl Fn(&AccessorContext, InputT, User) -> Fut
) -> Result<ResultT, Error>
    where
        ResultT: std::fmt::Debug,
        Fut: Future<Output = Result<ResultT, Error>>
{
    let mut anchor = crate::utils::general::data_anchor::DataAnchorFor1::empty(); // holds pg-client
    let ctx = crate::utils::db::accessors::AccessorContext::new_write(&mut anchor, gql_ctx).await?;
    let user_info = crate::db::general::sign_in_::jwt_utils::get_user_info_from_gql_ctx(&gql_ctx, &ctx).await?;

    let result = command_impl_func(&ctx, input, user_info).await?;

    ctx.tx.commit().await?;
    tracing::info!("Command completed! Result:{:?}", result);
    return Ok(result);
}*/
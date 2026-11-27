use std::iter::{empty, once};

use deadpool_postgres::{Pool, Transaction};
use futures_util::{Future, TryStreamExt};
use graphlink_rust::{json_value_to_guessed_sql_value_param_fragment, match_cond_to_iter, AccessorContext, CustomPGSerializer, IteratorV, SQLFragment, SQLIdent, SQLParam, SQLParamBoxed, SF};
use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::{self, MaybeUndefined};
use rust_shared::indoc::indoc;
use rust_shared::itertools::{chain, Itertools};
use rust_shared::serde::Serialize;
use rust_shared::serde_json::json;
use rust_shared::utils::type_aliases::{JSONValue, RowData};
use rust_shared::{bytes, serde_json};
use rust_shared::{
	tokio_postgres,
	tokio_postgres::{types::ToSql, Row},
};

use crate::db::users::User;

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

// a row is written as its blob (every other column is generated from it), through the crate's helpers
pub use graphlink_rust::{insert_db_entry_by_id_for_struct, set_db_entry_by_id, upsert_db_entry_by_id_for_struct};

pub async fn delete_db_entry_by_id(ctx: &AccessorContext<'_>, table_name: String, id: String) -> Result<Vec<Row>, Error> {
	Ok(delete_db_entry_by_field_value(ctx, table_name, "id".to_owned(), Box::new(id)).await?)
}
#[rustfmt::skip]
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
#[rustfmt::skip]
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

/*pub type FieldInit<T> = T;
pub type FieldInit_Nullable<T> = Option<T>;
pub type FieldInit_Omittable<T> = Option<T>;
pub type FieldInit_Nullable_Omittable<T> = MaybeUndefined<T>;
pub type FieldUpdate<T> = Option<T>;
pub type FieldUpdate_Nullable<T> = MaybeUndefined<T>;*/

// todo: probably rename the "XXXInput" structs to "XXXInit"

/// Under the hood, identical to `Option<T>`. However, this type-alias is used for db-struct fields (for updating), to signify the "type" of None value involved.  
///     (it also provides hoverable doc-text to explain the use-cases for db-struct fields)  
/// * If field is not-nullable, and field-set is required during init: Use `T` in base-struct, `T` in init-struct, and `CanOmit<T>` in update-struct.  
/// * If field is not-nullable, and field-set is optional during init: Use `T` in base-struct, `CanOmit<T>` in init-struct, and `CanOmit<T>` in update-struct.  
/// * If field is nullable, and its default value at init (ie. if left unspecified) is null: Use `Option<T>` in base-struct, `Option<T>` in init-struct, and `CanNullOrOmit<T>` in update-struct.  
/// * If field is nullable, and its default value at init (ie. if left unspecified) is non-null: Use `Option<T>` in base-struct, `CanNullOrOmit<T>` in init-struct, and `CanNullOrOmit<T>` in update-struct.  
pub type CanOmit<T> = Option<T>;

/// Under the hood, identical to `MaybeUndefined<T>`. However, this type-alias makes the name of the enum (which comes from async_graphql) more consistent with our custom `CanOmit`.
///     (it also provides hoverable doc-text to explain the use-cases for db-struct fields)  
/// * If field is not-nullable, and field-set is required during init: Use `T` in base-struct, `T` in init-struct, and `CanOmit<T>` in update-struct.  
/// * If field is not-nullable, and field-set is optional during init: Use `T` in base-struct, `CanOmit<T>` in init-struct, and `CanOmit<T>` in update-struct.  
/// * If field is nullable, and its default value at init (ie. if left unspecified) is null: Use `Option<T>` in base-struct, `Option<T>` in init-struct, and `CanNullOrOmit<T>` in update-struct.  
/// * If field is nullable, and its default value at init (ie. if left unspecified) is non-null: Use `Option<T>` in base-struct, `CanNullOrOmit<T>` in init-struct, and `CanNullOrOmit<T>` in update-struct.  
pub type CanNullOrOmit<T> = MaybeUndefined<T>;

// init helpers
// ==========

/*pub fn init_field_omittable<T>(val_in_init: CanOmit<T>, default_val: T) -> T {
	match val_in_init {
		None => default_val,
		Some(val) => val,
	}
}*/

pub fn init_field_of_extras(val_in_init: CanOmit<JSONValue>, start_val: JSONValue, locked_subfields: Vec<&str>) -> Result<JSONValue, Error> {
	// atm, the checks work the same in both cases
	update_field_of_extras(val_in_init, start_val, locked_subfields)
}

// update helpers
// ==========

/// Always use this to update non-nullable fields within "update_xxx" command-functions. (exception: a struct's `extras` field, which should use `update_field_of_extras`)
pub fn update_field<T>(val_in_updates: CanOmit<T>, old_val: T) -> T {
	match val_in_updates {
		None => old_val,
		Some(val) => val,
	}
}
/// Always use this to update nullable fields within "update_xxx" command-functions. (exception: a struct's `extras` field, which should use `update_field_of_extras`)
pub fn update_field_nullable<T>(val_in_updates: CanNullOrOmit<T>, old_val: Option<T>) -> Option<T> {
	match val_in_updates {
		MaybeUndefined::Undefined => old_val,
		MaybeUndefined::Null => None,
		MaybeUndefined::Value(val) => Some(val),
	}
}

/// Variant of `update_field` for use with the `extras` field of db-structs, allowing easy updating of its data through the standard `update_x` commands, while preserving locked subfields.
pub fn update_field_of_extras(val_in_updates: CanOmit<JSONValue>, old_val: JSONValue, locked_subfields: Vec<&str>) -> Result<JSONValue, Error> {
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

// others
// ==========

// Usage example: `command_boilerplate!(gql_ctx, input, only_validate, delete_map);`
// Note: I've tried creating two variants of this (a pair of pre and post macros, and a regular function); if wanted for reference, view git history.
macro_rules! command_boilerplate {
	($gql_ctx:ident, $input:ident, $only_validate:ident, $command_impl_func:ident) => {
		let mut anchor = graphlink_rust::DataAnchorFor1::empty(); // holds pg-client
		let ctx = graphlink_rust::AccessorContext::new_write_advanced(&mut anchor, $gql_ctx, false, $only_validate).await?;
		let actor = $crate::db::general::sign_in_::jwt_utils::get_user_info_from_gql_ctx($gql_ctx, &ctx).await?;
		let input_json = serde_json::to_string(&$input)?;

		let result = $command_impl_func(&ctx, &actor, true, $input, Default::default()).await?;

		if $only_validate.unwrap_or(false) {
			// before rolling back, ensure that none of the constraints are violated at this point (we must check manually, since commit is never called)
			graphlink_rust::trigger_deferred_constraints(&ctx.tx).await?;

			// the transaction would be rolled-back automatically after this blocks ends, but let's call rollback() explicitly just to be clear/certain
			ctx.tx.rollback().await?;
			tracing::info!("Command completed a \"validation only\" run without hitting errors. @Result:{:?} @Input:{} ", result, input_json);
		} else {
			ctx.tx.commit().await?;
			tracing::info!("Command executed. @Result:{:?} @Input:{}", result, input_json);
		}
		return Ok(result);
	};
}
pub(crate) use command_boilerplate;

pub type NoExtras = bool;

// todo: probably change command-params from having `actor: &User, is_root: bool` to having `cmd_ctx: CommandContext<'_>`
/*pub struct CommandContext<'a> {
	actor: &'a User,
	is_root: bool,
}
impl<'a> CommandContext<'a> {
	pub fn child(&self) -> Self {
		Self {
			actor: self.actor,
			is_root: false,
		}
	}
}*/

use std::{fmt::Display, sync::atomic::AtomicI32, iter::{once, Once}};
use rust_shared::{tokio_postgres, anyhow::{anyhow, bail, Context, Error, ensure}, bytes, utils::type_aliases::JSONValue};
use rust_shared::bytes::BytesMut;
use dyn_clone::DynClone;
use rust_shared::itertools::Itertools;
use regex::{Regex, Captures};
use rust_shared::BasicError;
use rust_shared::serde_json::Map;
use rust_shared::tokio_postgres::types::{ToSql, WrongType, Type, IsNull, Kind};
use lazy_static::lazy_static;

use super::sql_fragment::SQLFragment;

// (the ToSql constraint is for easier coding; sql-params that only interpolate themself into the query-str can have an empty/panicking ToSql implementation)
// (the 'static constraint makes things easier by declaring that SQLParam will only be implemented-for/used-on owned types rather than references)
/*pub trait SQLParam: ToSql + /*Clone +*/ Sync + std::fmt::Debug + 'static {
pub type SQLParam_ = SQLParam;*/
pub trait SQLParam_ /*: /*ToSql +*/ /*Clone +*/ Sync + std::fmt::Debug + 'static*/ {
    /// * Returned tuple's first-val is whether to "consume" the parameter-slot that was offered. (ie. whether it gets sent to db as an "actual" query-parameter)
    /// * Returned tuple's second-val is the "type" of parameter-slot that the offered slot must match.
    /// * Returned tuple's third-val is the text to interpolate into the query-string for this param.
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error>;
   
    // test
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>>;
}
pub trait SQLParam: SQLParam_ + DynClone + /*ToSql +*/ /*+ Clone*/ /*+ ?Sized*/ Send + Sync + std::fmt::Debug + 'static {}

dyn_clone::clone_trait_object!(SQLParam);

pub type SQLParamBoxed = Box<dyn SQLParam>;
/*impl<T: SQLParam + ?Sized> ToSql for Box<T> {
}*/
//impl<T: ToSql> ToSql for Box<T> {
/*impl ToSql for Box<dyn ToSql> {
    fn to_sql(&self, ty: &Type, out: &mut BytesMut) -> Result<IsNull, Box<dyn std::error::Error + Sync + Send>> where Self: Sized {
        let derefed: &dyn ToSql = &**self;
        derefed.to_sql(ty, out)
    }
    fn accepts(ty: &Type) -> bool where Self: Sized {
        T::accepts(ty)
    }
    fn to_sql_checked(&self, ty: &Type, out: &mut BytesMut) -> Result<IsNull, Box<dyn std::error::Error + Sync + Send>> {
        let derefed: &dyn ToSql = &**self;
        derefed.to_sql_checked(ty, out)
    }
}*/
impl<T: SQLParam + ?Sized> SQLParam_ for Box<T> {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> {
        //(**self).prep_integrate(offered_slot)
        T::prep_integrate(self, offered_slot)
    }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        (**self).to_sql_checked_(ty, out)
    }
}
impl<T: SQLParam + ?Sized + std::clone::Clone> SQLParam for Box<T> {}
// rather than this, just use `Box::new(x)`
/*pub fn sql_param_boxed<T: SQLParam>(val: T) -> SQLParamBoxed {
    Box::new(val)
}*/

// implement SQLParam for basic rust types
// for tokio-postgres <> postgres type-mapping: https://docs.rs/postgres/latest/postgres/types/trait.ToSql.html#types
// for postgres types: https://www.postgresql.org/docs/7.4/datatype.html#DATATYPE-TABLE
impl<T> SQLParam_ for Option<T> where T: SQLParam {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> {
        match self {
            Some(val) => val.prep_integrate(offered_slot),
            None => Ok((true, "$V", format!("${}", offered_slot))),
        }
    }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        match self {
            Some(val) => val.to_sql_checked_(ty, out),
            None => {
                //Option::<String>::None.to_sql_checked(ty, out)
                // for now, we're just gonna say that a None value is valid for all column-types in database (I don't know how to check nullability of db column atm, to compare)
                // todo: make sure this won't cause problems
                Ok(IsNull::Yes)
            },
        }
    }
}
impl<T: std::clone::Clone> SQLParam for Option<T> where T: SQLParam {}
fn prep_integrate_val(offered_slot: i32, type_annotation: &str) -> Result<(bool, &str, String), Error> {
    let interpolation_str = format!("${}{}", offered_slot, type_annotation);
    Ok((true, "$V", interpolation_str))
}
impl SQLParam_ for bool {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> { prep_integrate_val(offered_slot, "::bool") }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> { self.to_sql_checked(ty, out) }
}
impl SQLParam for bool {}
impl SQLParam_ for i32 {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> { prep_integrate_val(offered_slot, "::int4") }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> { self.to_sql_checked(ty, out) }
}
impl SQLParam for i32 {}
impl SQLParam_ for i64 {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> { prep_integrate_val(offered_slot, "::int8") }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> { self.to_sql_checked(ty, out) }
}
impl SQLParam for i64 {}
impl SQLParam_ for f32 {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> { prep_integrate_val(offered_slot, "::float4") }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> { self.to_sql_checked(ty, out) }
}
impl SQLParam for f32 {}
impl SQLParam_ for f64 {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> { prep_integrate_val(offered_slot, "::float8") }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> { self.to_sql_checked(ty, out) }
}
impl SQLParam for f64 {}
impl SQLParam_ for String {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> { prep_integrate_val(offered_slot, "::text") }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> { self.to_sql_checked(ty, out) }
}
impl SQLParam for String {}
impl SQLParam_ for JSONValue {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> { prep_integrate_val(offered_slot, "::jsonb") }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> { self.to_sql_checked(ty, out) }
}
impl SQLParam for JSONValue {}

pub trait ToSQLFragment {
    fn into_ident_fragment(self) -> Result<SQLFragment, Error>;
    fn into_value_fragment(self) -> Result<SQLFragment, Error>;
}

/*impl<T: SQLParam> SQLParam_ for Vec<T> {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> {
        //prep_integrate_val(offered_slot, "::bool")
        match self.get(0) {
            Some(first_val) => {
                let mut result = first_val.prep_integrate(offered_slot)?;
                result.2 = result.2 + "[]";
                Ok(result)
            },
            // for empty-vector case, postgres is fine with the type-annotation being left empty
            None => prep_integrate_val(offered_slot, ""),
        }
    }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        //self.to_sql_checked(ty, out)
        //<&[T] as SQLParam_>::to_sql_checked_(self.get(0).unwrap(), ty, out)
        /*match self.get(0) {
            Some(first_val) => first_val.to_sql_checked_(ty, out),
            None => {
                // I don't know how to handle the empty-vector case, so just assume it's valid // todo: make sure this doesn't cause problems
                //Ok(IsNull::No)
                // empty vectors serialize the same way regardless of type (thankfully), so 
                let empty_vec: Vec<bool> = vec![];
                empty_vec.to_sql_checked(ty, out)
            },
        }*/
    }
}
impl<T: SQLParam + std::clone::Clone> SQLParam for Vec<T> {}*/
impl<T: ToSql + SQLParam_> SQLParam_ for Vec<T> {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> {
        //prep_integrate_val(offered_slot, "::bool")
        match self.get(0) {
            Some(first_val) => {
                let mut result = first_val.prep_integrate(offered_slot)?;
                result.2 = result.2 + "[]";
                Ok(result)
            },
            // for empty-vector case, postgres is fine with the type-annotation being left empty
            None => prep_integrate_val(offered_slot, ""),
        }
    }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        self.to_sql_checked(ty, out)
    }
}
impl<T: ToSql + SQLParam_ + Send + Sync + std::clone::Clone + 'static> SQLParam for Vec<T> {}

/// Note: Always serializes as a value sql-param.
#[derive(Debug, Clone)]
pub struct CustomPGSerializer<T: ToSql> {
    pg_type: String,
    data: T,
}
impl<T: ToSql> CustomPGSerializer<T> {
    pub fn new(pg_type: String, data: T) -> Self {
        if pg_type.len() > 0 && !pg_type.starts_with("::") {
            panic!("Invalid pg-type string; it must start with \"::\". @provided:{}", pg_type);
        }
        Self {
            pg_type,
            data,
        }
    }
}
impl<T: ToSql> SQLParam_ for CustomPGSerializer<T> {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> {
        //Ok((true, "$V", self.pg_type.clone()))
        prep_integrate_val(offered_slot, self.pg_type.as_str())
    }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        self.data.to_sql_checked(ty, out)
    }
}
impl<T: ToSql + Send + Sync + std::clone::Clone + 'static> SQLParam for CustomPGSerializer<T> {}
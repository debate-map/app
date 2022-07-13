use std::{fmt::Display, sync::atomic::AtomicI32, iter::{once, Once}};
use anyhow::{anyhow, bail, Context, Error, ensure};
use itertools::Itertools;
use regex::{Regex, Captures};
use rust_shared::BasicError;
use serde_json::Map;
use tokio_postgres::types::{ToSql, WrongType};
use lazy_static::lazy_static;
use crate::{utils::type_aliases::JSONValue};

use super::{sql_fragment::SQLFragment, sql_param::{SQLParamBoxed, SQLParam, ToSQLFragment, SQLParam_}};

#[derive(Debug, Clone)]
pub struct SQLIdent {
    pub name: String,
}
impl SQLIdent {
    pub fn new(name: String) -> Result<SQLIdent, Error> {
        // defensive (actually: atm, this is required for safety); do extra checks to ensure identifiers only ever consist of alphanumerics and underscores
        lazy_static! {
            static ref REGEX_SAFE_IDENT: Regex = Regex::new(r"^[a-zA-Z0-9_]+$").unwrap();
        }
        ensure!(REGEX_SAFE_IDENT.is_match(&name), "An identifier was attempted to be used that contained invalid characters! Attempted identifier:{name}");
        Ok(Self {
            name
        })
    }
    pub fn new_boxed(name: String) -> Result<SQLParamBoxed, Error> {
        Ok(Box::new(Self::new(name)?))
    }
}
// implemented merely to fulfill the type-constraint on SQLParam
impl ToSql for SQLIdent {
    fn to_sql(&self, _ty: &tokio_postgres::types::Type, _out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> where Self: Sized {
        panic!("A SQLIdent instance was attempted to be serialized as a sql-param!");
    }
    fn accepts(_ty: &tokio_postgres::types::Type) -> bool where Self: Sized {
        panic!("A SQLIdent instance was attempted to be serialized as a sql-param!");
    }
    fn to_sql_checked(&self, typ: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        panic!("A SQLIdent instance was attempted to be serialized as a sql-param!");
    }
}
impl SQLParam_ for SQLIdent {
    fn prep_integrate(&self, offered_slot: i32) -> Result<(bool, &str, String), Error> {
        // defensive (actually: atm, this is required for safety); do extra checks to ensure identifiers only ever consist of alphanumerics and underscores
        lazy_static! {
            static ref REGEX_SAFE_IDENT: Regex = Regex::new(r"^[a-zA-Z0-9_]+$").unwrap();
        }
        ensure!(REGEX_SAFE_IDENT.is_match(&self.name), "An identifier was attempted to be used that contained invalid characters! Attempted identifier:{}", &self.name);

        //format!("${}", match_id)
        // temp; interpolate the identifier directly into the query-str (don't know a way to avoid it atm)
        Ok((false, "$I", format!("\"{}\"", self.name)))
    }
    fn to_sql_checked_(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> { self.to_sql_checked(ty, out) }
}
impl SQLParam for SQLIdent {}
/*impl ToSQLFragment for SQLIdent {
    fn into_ident_fragment(self) -> Result<SQLFragment, Error> {
        Ok(SQLFragment::new("$I", vec![self]))
    }
    fn into_value_fragment(self) -> Result<SQLFragment, Error> {
        Err(anyhow!("Cannot convert a SQLIdent into a value SQLFragment."))
    }
}*/

// Send is needed, else can't be used across .await points
//pub type ParamType = Box<dyn ToSql + Send + Sync>;
// see comments in get_db_entries() for reason this is needed
//pub type ParamType = Box<dyn Display>;
//pub type ParamType = String;

//pub trait ToSql_Clone: ToSql + Clone {}
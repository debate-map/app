use std::{fmt::Display, sync::atomic::AtomicI32, iter::{once, Once}};
use anyhow::{anyhow, bail, Context, Error, ensure};
use itertools::Itertools;
use regex::{Regex, Captures};
use rust_shared::BasicError;
use serde_json::Map;
use tokio_postgres::types::{ToSql, WrongType};
use lazy_static::lazy_static;
use crate::{utils::type_aliases::JSONValue};

use super::sql_fragment::SQLFragment;

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
    /// Shortcut for `SQLIdent::new(...).into_param()`.
    pub fn param(name: String) -> Result<SQLParam, Error> {
        Ok(SQLIdent::new(name)?.into_param())
    }

    pub fn into_param(self) -> SQLParam {
        SQLParam::Ident(self)
    }
}

// Send is needed, else can't be used across .await points
//pub type ParamType = Box<dyn ToSql + Send + Sync>;
// see comments in get_db_entries() for reason this is needed
//pub type ParamType = Box<dyn Display>;
//pub type ParamType = String;

#[derive(Debug, Clone)]
pub enum SQLParam {
    // for rust-postgres <> postgres type-mappings: https://docs.rs/postgres/latest/postgres/types/trait.FromSql.html#types

    /// For names of tables, columns, etc.
    Ident(SQLIdent),
    /// Examples: strings, numbers, etc. (for technical reasons, these currently must be converted to a String -- for most types this works fine [edit: is this still true?])
    Value_Null,
    Value_Bool(bool),
    Value_Int(i64),
    Value_Float(f64),
    Value_String(String),
    Value_JSONB(JSONValue),
}
impl SQLParam {
    pub fn into_ident_fragment(self) -> Result<SQLFragment, Error> {
        match self {
            SQLParam::Ident(_) => Ok(SQLFragment::new("$I", vec![self])),
            _ => bail!("Cannot convert a SQLParam:Value_XXX into an identifier SQLFragment."),
        }
    }
    pub fn into_value_fragment(self) -> Result<SQLFragment, Error> {
        match self {
            SQLParam::Ident(_) => bail!("Cannot convert a SQLParam:Ident into a value SQLFragment."),
            _ => Ok(SQLFragment::new("$V", vec![self])),
        }
    }
}

pub fn json_value_to_sql_value_param(json_val: &JSONValue) -> Result<SQLParam, Error> {
    match json_val {
        JSONValue::Null => Ok(SQLParam::Value_Null),
        JSONValue::Bool(val) => Ok(SQLParam::Value_Bool(*val)),
        JSONValue::Number(val) => {
            if let Some(val_i64) = val.as_i64() {
                return Ok(SQLParam::Value_Int(val_i64))
                /*let val_i32 = i32::try_from(val_i64)?;
                return Ok(SQLParam::Value_Int(val_i32));*/
            }
            if let Some(val_f64) = val.as_f64() {
                return Ok(SQLParam::Value_Float(val_f64));
            }
            Err(anyhow!("Invalid \"number\":{}", val))
        },
        JSONValue::String(val) => Ok(SQLParam::Value_String(val.to_owned())),
        // this is a bit inelegant here, in that we assume we want json-value scalars to map to the pg-type scalars, and the non-scalars to pg-type "jsonb", but that's not necessarily always the case
        JSONValue::Array(_data) => Ok(SQLParam::Value_JSONB(json_val.clone())),
        JSONValue::Object(_data) => Ok(SQLParam::Value_JSONB(json_val.clone())),
        _ => {
            //SQLParam::Value(op_val.to_string().replace('\"', "'").replace('[', "(").replace(']', ")"))
            bail!("Conversion from this type of json-value ({json_val:?}) to a SQLParam is not yet implemented. Instead, provide one of: String, Number, Bool, Null");
        },
    }
}

impl ToSql for SQLParam {
    fn to_sql(&self, _ty: &tokio_postgres::types::Type, _out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> where Self: Sized {
        /*match self {
            //SQLParam::Ident(str) => str.to_sql(ty, out),
            SQLParam::Ident(_str) => {
                // instead, it should be interpolated into the query-str (since I don't know of a better way atm); see SQLFragment.into_query_args()
                panic!("to_sql should never be called on a SQLParam::Ident!");
            },
            SQLParam::Value_Null => {
                let temp: Option<&str> = None;
                temp.to_sql(ty, out)
            },
            SQLParam::Value_Bool(val) => val.to_sql(ty, out),
            SQLParam::Value_Float(val) => val.to_sql(ty, out),
            SQLParam::Value_String(val) => val.to_sql(ty, out),
        }*/
        panic!("Call to_sql_checked instead.");
    }
    //tokio_postgres::types::accepts!(Bool);
    fn accepts(_ty: &tokio_postgres::types::Type) -> bool where Self: Sized {
        /*//println!("Type:{} Accepts:{}", ty, String::accepts(ty));
        //if let tokio_postgres::types::Type::BOOL(ty) = ty {
        if ty.name().to_lowercase() == "bool" { return true; }

        // test
        //if ty.name().to_lowercase() == "_text" { return true; }

        String::accepts(ty)*/
        panic!("Call to_sql_checked instead.");
    }
    //tokio_postgres::types::to_sql_checked!();

    fn to_sql_checked(&self, typ: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> {
        match self {
            //SQLParam::Ident(str) => str.to_sql(typ, out),
            SQLParam::Ident(_str) => {
                // instead, it should be interpolated into the query-str (since I don't know of a better way atm); see SQLFragment.into_query_args()
                panic!("to_sql should never be called on a SQLParam::Ident!");
            },
            SQLParam::Value_Null => {
                let val: Option<&str> = None;

                // commented; don't do any type-checks, since we'd need to manually match each Option<T> to the sql-type
                // (also, the null gets output the same way in each case -- and the database should reject the operation if null is invalid for the column)
                //if !Option::<&str>::accepts(typ) { return Err(Box::new(WrongType::new::<Self>(typ.clone()))); }
                //if !Option::<&str>::accepts(typ) { return Err(BasicError::boxed(format!("Cannot convert SQLParam::Value_Null to pg type \"{typ}\"."))); }

                val.to_sql(typ, out)
            },
            SQLParam::Value_Bool(val) => {
                if !bool::accepts(typ) { return Err(BasicError::boxed(format!("Cannot convert SQLParam::Value_Bool to pg type \"{typ}\"."))); }
                val.to_sql(typ, out)
            },
            SQLParam::Value_Int(val) => {
                if !i64::accepts(typ) { return Err(BasicError::boxed(format!("Cannot convert SQLParam::Value_Int to pg type \"{typ}\"."))); }
                val.to_sql(typ, out)
            },
            SQLParam::Value_Float(val) => {
                if !f64::accepts(typ) { return Err(BasicError::boxed(format!("Cannot convert SQLParam::Value_Float to pg type \"{typ}\"."))); }
                val.to_sql(typ, out)
            },
            SQLParam::Value_String(val) => {
                if !String::accepts(typ) { return Err(BasicError::boxed(format!("Cannot convert SQLParam::Value_String to pg type \"{typ}\"."))); }
                val.to_sql(typ, out)
            },
            SQLParam::Value_JSONB(val) => {
                if !JSONValue::accepts(typ) { return Err(BasicError::boxed(format!("Cannot convert SQLParam::Value_JSONB to pg type \"{typ}\"."))); }
                val.to_sql(typ, out)
            },
        }
    }
}
use std::{fmt::Display, sync::atomic::AtomicI32, iter::{once, Once}};
use anyhow::{anyhow, bail, Context, Error, ensure};
use itertools::Itertools;
use regex::{Regex, Captures};
use serde_json::Map;
use tokio_postgres::types::ToSql;
use crate::{utils::type_aliases::JSONValue};

use super::sql_fragment::SQLFragment;

#[derive(Debug, Clone)]
pub struct SQLIdent {
    pub name: String,
}
impl SQLIdent {
    pub fn new(name: String) -> Result<SQLIdent, Error> {
        // defensive (actually: atm, this is required for safety); do extra checks to ensure identifiers only ever consist of alphanumerics and underscores
        let re = Regex::new(r"^[a-zA-Z0-9_]+$").unwrap();
        ensure!(re.is_match(&name), "An identifier was attempted to be used that contained invalid characters! Attempted identifier:{name}");
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
//#[derive(Debug, Clone)]
pub enum SQLParam {
    /// For names of tables, columns, etc.
    Ident(SQLIdent),
    /// Examples: strings, numbers, etc. (for technical reasons, these currently must be converted to a String -- for most types this works fine)
    Value_String(String),
    Value_Null,
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
        JSONValue::String(val) => Ok(SQLParam::Value_String(val.to_owned())),
        JSONValue::Number(val) => Ok(SQLParam::Value_String(val.to_string())),
        JSONValue::Bool(val) => Ok(SQLParam::Value_String(val.to_string())),
        JSONValue::Null => Ok(SQLParam::Value_Null),
        _ => {
            //SQLParam::Value(op_val.to_string().replace('\"', "'").replace('[', "(").replace(']', ")"))
            bail!("Conversion from this type of json-value ({json_val:?}) to a SQLParam is not yet implemented. Instead, provide one of: String, Number, Bool, Null");
        },
    }
}

impl ToSql for SQLParam {
    fn to_sql(&self, ty: &tokio_postgres::types::Type, out: &mut bytes::BytesMut) -> Result<tokio_postgres::types::IsNull, Box<dyn std::error::Error + Sync + Send>> where Self: Sized {
        match self {
            //SQLParam::Ident(str) => str.to_sql(ty, out),
            SQLParam::Ident(_str) => {
                // instead, it should be interpolated into the query-str (since I don't know of a better way atm); see SQLFragment.into_query_args()
                panic!("to_sql should never be called on a SQLParam::Ident!");
            },
            SQLParam::Value_String(str) => {
                if ty.name().to_lowercase() == "bool" {
                    let str_as_bool = str.to_lowercase() == "true";
                    return str_as_bool.to_sql(ty, out);
                }

                str.to_sql(ty, out)
            },
            SQLParam::Value_Null => {
                let temp: Option<&str> = None;
                temp.to_sql(ty, out)
            },
        }
    }
    //tokio_postgres::types::accepts!(Bool);
    fn accepts(ty: &tokio_postgres::types::Type) -> bool where Self: Sized {
        //println!("Type:{} Accepts:{}", ty, String::accepts(ty));
        //if let tokio_postgres::types::Type::BOOL(ty) = ty {
        if ty.name().to_lowercase() == "bool" { return true; }

        // test
        //if ty.name().to_lowercase() == "_text" { return true; }

        String::accepts(ty)
    }
    tokio_postgres::types::to_sql_checked!();
}
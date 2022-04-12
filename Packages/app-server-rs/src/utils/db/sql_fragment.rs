use std::{fmt::Display, sync::atomic::AtomicI32, iter::{once, Once}};
use anyhow::{anyhow, bail, Context, Error, ensure};
use itertools::Itertools;
use regex::{Regex, Captures};
use serde_json::Map;
use tokio_postgres::types::ToSql;
use lazy_static::lazy_static;
use crate::{utils::type_aliases::JSONValue};

use super::sql_param::SQLParam;

/// Alias for SQLFragment, to make it shorter to call things like... SF::new, SF::lit, SF::merge
pub type SF = SQLFragment;
#[derive(Clone)] // can't do this atm, since can't have ToSql+Clone for params field (see: https://github.com/rust-lang/rust/issues/32220)
pub struct SQLFragment {
    pub sql_text: String,
    pub params: Vec<SQLParam>,
}
impl SQLFragment {
    /// For param-placeholders in sql_text, use $I for identifiers, and $V for values.
    /// Note: In sql-text, don't add quotes around these markers/placeholders. (only exceptions are some complex structures, eg. the outer quotes and brackets for jsonb arrays)
    pub fn new(sql_text: &'static str, params: Vec<SQLParam>) -> Self {
        Self {
            sql_text: sql_text.to_owned(),
            //params: params.into_iter().map(|a| Box::new(a) as ParamType).collect(),
            params: params,
        }
    }
    /// Like new(), except wraps the result in a `once` iterator; this makes it easy to use in the itertool `chain!(...)` macro
    pub fn new_once(sql_text: &'static str, params: Vec<SQLParam>) -> Once<Self> {
        once(Self::new(sql_text, params))
    }
    pub fn lit(sql_text: &'static str) -> Self {
        Self::new(sql_text, vec![])
    }
    /// Like lit(), except wraps the result in a `once` iterator; this makes it easy to use in the itertool `chain!(...)` macro
    pub fn lit_once(sql_text: &'static str) -> Once<Self> {
        once(Self::lit(sql_text))
    }
    
    /// Only use this when you have to: when the number/placement of Identifiers in the SQL query-text is dynamic.
    /*pub fn INTERPOLATED_SQL(sql_text: String, params: Vec<SQLParam>) -> Self {
        Self {
            sql_text: sql_text,
            params: params,
        }
    }*/

    pub fn merge(fragments: Vec<SQLFragment>) -> SQLFragment {
        let mut sql_text = "".to_owned();
        let mut params: Vec<SQLParam> = vec![];
        for fragment in fragments {
            sql_text += &fragment.sql_text;
            for param in fragment.params {
                params.push(param);
            }
        }
        Self { sql_text, params }
    }
    /// Like `merge()`, except having a SQLFragment of `\n` inserted between each provided fragment.
    pub fn merge_lines(line_fragments: Vec<SQLFragment>) -> SQLFragment {
        let mut final_fragments = vec![];
        for (i, frag) in line_fragments.into_iter().enumerate() {
            if i > 0 {
                final_fragments.push(Self::lit("\n"));
            }
            final_fragments.push(frag);
        }
        Self::merge(final_fragments)
    }

    pub fn into_query_args(&mut self) -> Result<(String, Vec<SQLParam>), Error> {
        let sql_base = std::mem::replace(&mut self.sql_text, "".to_owned());
        lazy_static! {
            static ref REGEX_PLACEHOLDER: Regex = Regex::new(r"\$[IV]").unwrap();
        }

        let mut next_match_index = 0;
        let mut next_value_id = 1;
        let mut error = None;
        let sql_final = REGEX_PLACEHOLDER.replace_all(&sql_base, |caps: &Captures| {
            let result = (|| {
                //println!("Replacing sql-param placeholder at:{:?}", caps.get(0).to_owned());
                let caps_g0 = caps.get(0).ok_or(anyhow!("Capture was missing/invalid."))?;
                let match_index = next_match_index;
                next_match_index += 1;
                let param = self.params.get(match_index).with_context(|| format!("SQL query-string references param with index {match_index}, but no corresponding param was found."))?;
                match param {
                    SQLParam::Ident(ident) => {
                        ensure!(caps_g0.as_str() == "$I", "Placeholder-type ({}) doesn't match with param-type (Ident)!", caps_g0.as_str()); // defensive

                        // defensive (actually: atm, this is required for safety); do extra checks to ensure identifiers only ever consist of alphanumerics and underscores
                        lazy_static! {
                            static ref REGEX_SAFE_IDENT: Regex = Regex::new(r"^[a-zA-Z0-9_]+$").unwrap();
                        }
                        ensure!(REGEX_SAFE_IDENT.is_match(&ident.name), "An identifier was attempted to be used that contained invalid characters! Attempted identifier:{}", &ident.name);

                        //format!("${}", match_id)
                        // temp; interpolate the identifier directly into the query-str (don't know how to avoid it atm)
                        Ok(format!("\"{}\"", ident.name))
                    },
                    _ => {
                        ensure!(caps_g0.as_str() == "$V", "Placeholder-type provided ({}) must be $V, for param of type Value_XXX!", caps_g0.as_str()); // defensive

                        let value_id = next_value_id;
                        next_value_id += 1;

                        /*let type_annotation = match value_id {
                            1 => "::int",
                            _ => "",
                        };*/
                        // for tokio-postgres <> postgres type-mapping: https://docs.rs/postgres/latest/postgres/types/trait.ToSql.html#types
                        // for postgres types: https://www.postgresql.org/docs/7.4/datatype.html#DATATYPE-TABLE
                        let type_annotation = match param {
                            SQLParam::Ident(_) => panic!("Invalid for this match group!"),
                            SQLParam::Value_Null => "",
                            SQLParam::Value_Bool(_) => "::bool",
                            SQLParam::Value_Int(_) => "::int8",
                            SQLParam::Value_Float(_) => "::float8",
                            SQLParam::Value_String(_) => "::text",
                        };
                        
                        Ok(format!("${}{}", value_id, type_annotation))
                    },
                }
            })();
            result.map_err(|err| error = Some(err)).unwrap_or_default()
        }).into_owned();
        //error.map_or(Ok(()), |a| Err(a))?;
        if let Some(err) = error { return Err(err); }

        // defensive
        let placeholders_found = next_match_index;
        ensure!(placeholders_found == self.params.len(), "Placeholder and param lengths differ!");
        
        let params_base = std::mem::replace(&mut self.params, vec![]);
        let params_final = params_base.into_iter().filter_map(|a| {
            match a {
                // identifiers are (safely -- by goal, anyway) inlined into the sql-text, so don't send them to tokio-postgres/the-db as "actual" params
                SQLParam::Ident(_str) => None,
                /*SQLParam::Value_String(str) => Some(SQLParam::Value_String(str)),
                SQLParam::Value_Float(str) => Some(SQLParam::Value_Float(str)),
                SQLParam::Value_Null => Some(SQLParam::Value_Null),*/
                _a => Some(_a)
            }
        }).collect();
        
        Ok((sql_final, params_final))
    }
}
impl Display for SQLFragment {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_fmt(format_args!("(sql:\"{}\", params:{:?})", self.sql_text, self.params))?;
        Ok(())
    }
}
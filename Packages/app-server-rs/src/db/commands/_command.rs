// work-in-progress; once the new Command system is worked out here in Rust, I'll start migrating the Command classes from app-server-js into it

use std::iter::{once, empty};

use itertools::{chain, Itertools};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{bytes, serde_json};
use rust_shared::serde::Serialize;
use async_trait::async_trait;
use futures_util::{TryStreamExt};
use rust_shared::serde_json::json;
use rust_shared::{tokio_postgres, tokio_postgres::{Row, types::ToSql}};
use rust_shared::anyhow::{anyhow, Error, Context};
use deadpool_postgres::{Transaction, Pool};

use crate::utils::{db::{sql_fragment::{SQLFragment, SF}, filter::{FilterInput, QueryFilter, json_value_to_guessed_sql_value_param_fragment}, queries::get_entries_in_collection_basic, accessors::AccessorContext, sql_ident::SQLIdent, sql_param::{SQLParam, CustomPGSerializer}}, general::{general::{to_anyhow, match_cond_to_iter}, data_anchor::{DataAnchor, DataAnchorFor1}, extensions::IteratorV}, type_aliases::{PGClientObject, RowData}};

pub struct UserInfo {
    pub id: String,
}

#[async_trait(?Send)]
pub trait Command {
    async fn Validate(&self, ctx: &AccessorContext<'_>) -> Result<JSONValue, Error>;
    fn Commit(&self, ctx: &AccessorContext<'_>) -> Result<(), Error>;
}

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
                        if table_name == "nodePhrasings" && key_and_val.0 == "references" {
                            let as_array = key_and_val.1.as_array().unwrap().clone();
                            let as_array_of_strings = as_array.iter().map(|a| a.as_str().unwrap().to_owned()).collect_vec();
                            /*let mut as_array_of_strings: Vec<String> = vec![];
                            for val in as_array {
                                as_array_of_strings.push(val.as_str().unwrap().to_owned());
                            }*/
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

    // this basically "unboxes" the params into refs; this is needed for each entry to satisfy the ToSql constraint
    // (see here for more info: https://github.com/sfackler/rust-postgres/issues/712)
    /*let params_as_refs: Vec<&(dyn ToSql + Sync)> = params.iter()
        .map(|x| x/*.as_ref()*/ as &(dyn ToSql + Sync))
        .collect();*/

    let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
    let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

    //let rows: Vec<Row> = ctx.tx.query_raw(&sql_text, params).await.map_err(to_anyhow)?.try_collect().await.map_err(to_anyhow)?;
    let rows: Vec<Row> = ctx.tx.query_raw(&sql_text, params_as_refs).await
        .map_err(|err| {
            anyhow!("Got error while running query, for setting db-entry. @error:{}\n{}", err.to_string(), &debug_info_str)
        })?
        .try_collect().await.map_err(|err| {
            anyhow!("Got error while collecting results of db-query, for setting db-entry. @error:{}\n{}", err.to_string(), &debug_info_str)
        })?;
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
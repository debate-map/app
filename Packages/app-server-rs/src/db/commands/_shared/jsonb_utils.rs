use std::iter::empty;

use deadpool_postgres::{Transaction, tokio_postgres::types::ToSql};
use rust_shared::{utils::{type_aliases::JSONValue, general_::extensions::IteratorV}, itertools::{chain, Itertools}, anyhow::{anyhow, Error, Context}, serde_json};

use crate::{utils::{db::{sql_fragment::{SF, SQLFragment}, sql_param::{SQLParamBoxed, CustomPGSerializer}, sql_ident::SQLIdent}, general::{general::match_cond_to_iter}}, db::commands::_command::ToSqlWrapper};

pub async fn jsonb_set(tx: &Transaction<'_>, table: &str, id: &str, field: &str, jsonb_path: Vec<String>, value: Option<JSONValue>) -> Result<(), Error> {
    let mut sql_fragment = jsonb_set_to_sql_fragment(table, id, field, jsonb_path, value)?;

    let (sql_text, params) = sql_fragment.into_query_args()?;

    let debug_info_str = format!("@sqlText:{}\n@params:{:?}", &sql_text, &params);
    // wrap params into boxes, then refs, to satisfy ToSql constraint generically; not ideal, but best approach known atm; see: https://github.com/sfackler/rust-postgres/issues/712
    let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
    let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

    tx.execute_raw(&sql_text, params_as_refs).await
        //.map_err(|err| anyhow!("Got error while running query, for call to jsonb-set. @error:{}\n{}", err.to_string(), &debug_info_str))?;
        .with_context(|| anyhow!("Got error while running query, for call to jsonb-set. {}", &debug_info_str))?;

    Ok(())
}

pub fn jsonb_set_to_sql_fragment(table: &str, id: &str, field: &str, jsonb_path: Vec<String>, jsonb_value: Option<JSONValue>) -> Result<SQLFragment, Error> {
    Ok(match jsonb_value {
        Some(jsonb_value) => {
            // the value for this code-path will always be within a JSONB cell, so just json-serialize it
            //let value_serialized_as_json_string = serde_json::to_string(&value)?;
            
            // approach for safely setting the value of a "deeply nested" in-jsonb field (see here: https://stackoverflow.com/a/69534368)
            SF::merge_lines(vec![
                SF::new("UPDATE $I SET $I =", vec![
                    SQLIdent::new_boxed(table.to_owned())?,
                    SQLIdent::new_boxed(field.to_owned())?,
                ]),
                SF::merge_lines(
                    jsonb_path.iter().enumerate().map(|(i, subfield)| -> Result<SQLFragment, Error> {
                        let prior_path_segments = jsonb_path.iter().take(i).cloned().collect_vec();
                        Ok(SF::merge(vec![
                            SF::new("jsonb_set(COALESCE($I", vec![SQLIdent::new_boxed(field.to_owned())?]),
                            SF::merge(
                                prior_path_segments.iter().map(|subfield| {
                                    SF::merge(vec![
                                        //SF::lit("->'"),
                                        SF::lit("->"),
                                        SF::value(subfield.to_owned()),
                                        //SF::lit("'"),
                                    ])
                                }).collect_vec()
                            ),
                            //SF::new(", '{}'), '{$I}',", vec![SQLIdent::new_boxed(subfield.to_owned())?]),
                            SF::new(", '{}'), array[$V],", vec![Box::new(subfield.to_owned())]),
                        ]))
                    }).try_collect2::<Vec<_>>()?
                ),
                //SF::value(Box::new(value_serialized_as_json_string)),
                //SF::value(CustomPGSerializer::new("::jsonb".to_owned(), value_serialized_as_json_string)),
                //SF::value(CustomPGSerializer::new("::jsonb".to_owned(), jsonb_value.clone())),
                SF::value(jsonb_value),
                SF::merge(
                    jsonb_path.iter().map(|_| SF::lit(")")).collect_vec()
                ),
                SF::new("WHERE id = $V", vec![Box::new(id.to_owned())]),
            ])
        },
        None => {
            /*let jsonb_path_quoted = jsonb_path.iter().map(|a| format!("'{a}'")).collect_vec();
            let query = format!("UPDATE \"{table}\" SET \"{field}\" = \"{field}\" #- ");
            tx.query(&query, &[]).await?;*/

            //let mut final_query = SF::new(format!("UPDATE $I SET $I = $I #- array[{jsonb_path_quoted}] WHERE id = $V"), vec![
            SF::merge(vec![
                SF::new("UPDATE $I SET $I = $I #- array[", vec![
                    SQLIdent::new_boxed(table.to_owned())?,
                    SQLIdent::new_boxed(field.to_owned())?,
                    SQLIdent::new_boxed(field.to_owned())?,
                ]),
                SF::merge(
                    /*jsonb_path.iter().enumerate().map(|(i, subfield)| -> Result<SQLFragment, Error> {
                        Ok(SF::merge(chain!(
                            match_cond_to_iter(i > 0, SF::lit(", ").once(), empty()),
                            //Some(SF::ident(SQLIdent::new(subfield.to_owned())?)),
                            Some(SF::value(subfield.to_owned())),
                        ).collect_vec()))
                    }).try_collect2::<Vec<_>>()?,*/
                    jsonb_path.iter().enumerate().map(|(i, subfield)| {
                        SF::merge(vec![
                            if i > 0 { SF::lit(", ") } else { SF::lit("") },
                            SF::value(subfield.to_owned()),
                        ])
                    }).collect_vec(),
                ),
                SF::new("] WHERE id = $V", vec![Box::new(id.to_owned())]),
            ])
        },
    })
}

#[cfg(test)]
mod tests {
    use rust_shared::{serde_json::json, indoc::indoc};

    use crate::db::commands::_shared::jsonb_utils::jsonb_set_to_sql_fragment;

    // run in PowerShell using: `cargo test jsonb_set -- --nocapture`
    #[test]
    fn jsonb_set() {
        let mut sql = jsonb_set_to_sql_fragment(
            "myTable", "myRowID", "myField",
            vec!["depth1".to_owned(), "depth2".to_owned(), "depth3".to_owned(), "depth4".to_owned()],
            Some(json!("newValue")),
        ).unwrap();
        // meant to match with example shown here: https://stackoverflow.com/a/69534368
        /*assert_eq!(sql.sql_text, indoc!(r#"
            UPDATE $I SET $I =
            jsonb_set(COALESCE($I, '{}'), array[$V],
            jsonb_set(COALESCE($I->'depth1', '{}'), array[$V],
            jsonb_set(COALESCE($I->'depth1'->'depth2', '{}'), array[$V],
            jsonb_set(COALESCE($I->'depth1'->'depth2'->'depth3', '{}'), array[$V],
            $V
            )))) WHERE $I = $V
        "#));*/
        assert_eq!(sql.sql_text, indoc!(r#"
            UPDATE $I SET $I =
            jsonb_set(COALESCE($I, '{}'), array[$V],
            jsonb_set(COALESCE($I->$V, '{}'), array[$V],
            jsonb_set(COALESCE($I->$V->$V, '{}'), array[$V],
            jsonb_set(COALESCE($I->$V->$V->$V, '{}'), array[$V],
            $V
            ))))
            WHERE id = $V
        "#).trim_end());
        let (sql_text_final, params) = sql.into_query_args().unwrap();
        assert_eq!(sql_text_final, indoc!(r#"
            UPDATE "myTable" SET "myField" =
            jsonb_set(COALESCE("myField", '{}'), array[$1::text],
            jsonb_set(COALESCE("myField"->$2::text, '{}'), array[$3::text],
            jsonb_set(COALESCE("myField"->$4::text->$5::text, '{}'), array[$6::text],
            jsonb_set(COALESCE("myField"->$7::text->$8::text->$9::text, '{}'), array[$10::text],
            $11::jsonb
            ))))
            WHERE id = $12::text
        "#).trim_end());
        assert_eq!(params.len(), 12);
    }

    // run in PowerShell using: `cargo test jsonb_delete -- --nocapture`
    /*#[test]
    fn jsonb_delete() {
    }*/
}
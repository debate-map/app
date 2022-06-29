use rust_macros::wrap_slow_macros;
use serde::Deserialize;
use serde_json::Map;

use crate::{utils::type_aliases::JSONValue};

pub type RowData = Map<String, JSONValue>;

#[cfg(test)]
mod tests {
    use crate::utils::db::pg_stream_parsing::parse_postgres_array_as_strings;

    #[test]
    fn simple() {
        let simple_source = "{example}";
        let simple_result = parse_postgres_array_as_strings(simple_source);
        assert_eq!(simple_result, vec!["example"]);
    }
    #[test]
    fn escaped() {
        let escaped_source = r#"{"example \"text\" with quotes in it",123123}"#;
        let escaped_result = parse_postgres_array_as_strings(escaped_source);
        assert_eq!(escaped_result, vec![r#"example "text" with quotes in it"#, "123123"]);
    }
}

/// See: https://github.com/eulerto/wal2json/issues/221#issuecomment-1025143441
/// View the tests above for examples, and intended functionality.
pub fn parse_postgres_array(array_str: &str, items_are_serialized: bool) -> JSONValue {
    let result_as_strings: Vec<String> = parse_postgres_array_as_strings(array_str);
    let result_as_json_values = result_as_strings.into_iter().map(|item_as_str| {
        if items_are_serialized {
            serde_json::from_str(&item_as_str).unwrap()
        } else {
            serde_json::Value::String(item_as_str)
        }
    }).collect();
    let result_within_json_array = serde_json::Value::Array(result_as_json_values);
    result_within_json_array
}
pub fn parse_postgres_array_as_strings(array_str: &str) -> Vec<String> {
    let chars_struct = array_str.chars();
    let chars = chars_struct.collect::<Vec<char>>();
    // todo: make sure this is fine as-is (it might need to accept number values as well; not sure about the pathway and/or frontend handling)
    let mut result_as_strings: Vec<String> = vec![];

    let mut in_quote = false;
    let mut in_entry = false;
    let mut last_char_was_escape_backslash = false;
    //let mut current_entry_str: Option<String> = None;
    let mut current_entry_str: String = String::new(); // empty means none

    /*let mut end_current_entry = || {
        result_as_strings.push(current_entry_str.unwrap());
        current_entry_str = None;
        in_quote = false;
        in_entry = false;
    };*/

    //for (i, ch) in chars.enumerate() {
    //let chars_length = chars.into_iter().count();
    let chars_length = chars.len();
    for (i, ch) in chars.into_iter().enumerate() {
        if last_char_was_escape_backslash {
            last_char_was_escape_backslash = false;
            //current_entry_str.unwrap().push(ch);
            current_entry_str.push(ch);
            continue;
        }

        match ch {
            '{' if i == 0 => {},
            '}' if i == chars_length - 1 => {
                //if current_entry_str.is_some() {
                if !current_entry_str.is_empty() {
                    //end_current_entry();
                    {
                        /*result_as_strings.push(current_entry_str.unwrap());
                        current_entry_str = None;*/
                        result_as_strings.push(current_entry_str);
                        current_entry_str = String::new();
                        in_quote = false;
                        in_entry = false;
                    }
                }
            },
            '\\' => {
                last_char_was_escape_backslash = true;
            },
            '"' => {
                in_quote = !in_quote;
                // if just left a quote
                if !in_quote {
                    //end_current_entry();
                    {
                        result_as_strings.push(current_entry_str);
                        current_entry_str = String::new();
                        in_quote = false;
                        in_entry = false;
                    }
                }
            },
            // ie. if just left a quote
            ',' if !in_entry => {},
            // if hit a separator after a non-quoted entry
            ',' if in_entry && !in_quote => {
                //end_current_entry();
                {
                    result_as_strings.push(current_entry_str);
                    current_entry_str = String::new();
                    in_quote = false;
                    in_entry = false;
                }
            },
            _ => {
                // if hit start of entry
                //if current_entry_str.is_none() {
                if current_entry_str.is_empty() {
                    //current_entry_str = Some(String::new());
                    current_entry_str = String::new();
                    in_entry = true;
                }
                current_entry_str.push(ch);
            }
        };
    }
    result_as_strings
}

#[derive(Deserialize)]
pub struct LDChange {
    pub kind: String,
    /// Present in data from lds, but not used for anything atm (within app-server-rs).
    pub schema: String,
    pub table: String,
    pub columnnames: Option<Vec<String>>,
    pub columntypes: Option<Vec<String>>,
    pub columnvalues: Option<Vec<JSONValue>>,
    pub oldkeys: Option<OldKeys>,
}
impl LDChange {
    pub fn new_data_as_map(&self) -> Option<RowData> {
        //let new_entry = JSONValue::Object();
        //let new_entry = json!({});
        let mut new_entry: RowData = Map::new();
        for (i, key) in self.columnnames.as_ref()?.iter().enumerate() {
            let typ = self.columntypes.as_ref()?.get(i).unwrap();
            let value = self.columnvalues.as_ref()?.get(i).unwrap();
            new_entry.insert(key.to_owned(), clone_ldchange_val_0with_type_fixes(value, typ));
        }
        //*new_entry.as_object().unwrap()
        Some(new_entry)
    }
    /// Tries to get row-id from `oldkeys` data; else, falls back to using the new-data (ie. from `columnvalues`).
    pub fn get_row_id(&self) -> String {
        let id_from_oldkeys = self.oldkeys.clone()
            .and_then(|a| a.data_as_map().get("id").cloned())
            .and_then(|a| a.as_str().map(|b| b.to_owned()));
        match id_from_oldkeys {
            Some(id) => id,
            None => {
                let new_data_as_map = self.new_data_as_map();
                new_data_as_map.unwrap().get("id").unwrap().as_str().map(|a| a.to_owned()).unwrap()
            },
        }
    }
}
fn clone_ldchange_val_0with_type_fixes(value: &JSONValue, typ: &str) -> JSONValue {
    if typ.ends_with("[]") {
        let item_type_as_bytes = &typ.as_bytes()[..typ.find("[]").unwrap()];
        let item_type = String::from_utf8(item_type_as_bytes.to_vec()).unwrap();
        return parse_postgres_array(value.as_str().unwrap(), item_type == "jsonb");
    }
    match typ {
        "jsonb" => {
            // the LDChange vals of type jsonb are initially stored as strings
            // convert that to a serde_json::Value::Object, so serde_json::from_value(...) can auto-deserialize it to a nested struct
            match value.as_str() {
                Some(val_as_str) => {
                    serde_json::from_str(val_as_str).unwrap()
                },
                None => serde_json::Value::Null,
            }
        },
        _ => value.clone(),
    }
}
wrap_slow_macros!{
#[derive(Clone, Deserialize)]
pub struct OldKeys {
    pub keynames: Vec<String>,
    pub keytypes: Vec<String>,
    pub keyvalues: Vec<JSONValue>,
}
}
impl OldKeys {
    pub fn data_as_map(&self) -> RowData {
        let mut new_entry: RowData = Map::new();
        for (i, key) in self.keynames.iter().enumerate() {
            let typ = self.keytypes.get(i).unwrap();
            let value = self.keyvalues.get(i).unwrap();
            new_entry.insert(key.to_owned(), clone_ldchange_val_0with_type_fixes(value, typ));
        }
        new_entry
    }
}

/*
[postgres logical-decoding message examples]

row addition
==========
{"change":[
    {
        "kind":"insert",
        "schema":"app_public",
        "table":"globalData",
        "columnnames":["extras","id"],
        "columntypes":["jsonb","text"],
        "columnvalues":[
            "{\"dbReadOnly\": false, \"dbReadOnly_message\": \"test1\"}",
            "main2"
        ]
    }
]}

row change
==========
{"change": [
    {
        "kind":"update",
        "schema":"app_public",
        "table":"globalData",
        "columnnames":["extras","id"],
        "columntypes":["jsonb","text"],
        "columnvalues":[
            "{\"dbReadOnly\": false, \"dbReadOnly_message\": \"test123\"}",
            "main"
        ],
        "oldkeys":{
            "keynames":["id"],
            "keytypes":["text"],
            "keyvalues":["main"]
        }
    }
]}

row deletion (regular mode)
==========
{"change":[
    {
        "kind":"delete",
        "schema":"app_public",
        "table":"globalData",
        "oldkeys":{
            "keynames":["id"],
            "keytypes":["text"],
            "keyvalues":["main2"]
        }
    }
]}
*/
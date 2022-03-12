use super::type_aliases::JSONValue;

#[cfg(test)]
mod tests {
    use crate::utils::postgres_parsing::parse_postgres_array_as_strings;

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
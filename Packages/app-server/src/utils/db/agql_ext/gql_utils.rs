use std::collections::BTreeMap;

use rust_shared::{async_graphql::{self, parser::types::ExecutableDocument, SimpleObject, InputObject, OutputType, InputValueError, Value, ScalarType, Scalar, InputType, InputValueResult, Name}, rust_macros::wrap_slow_macros, indexmap::IndexMap};
use serde::{Serialize, Deserialize};

pub fn get_root_fields_in_doc(doc: ExecutableDocument) -> Vec<String> {
    let mut query_fields: Vec<String> = vec![];
    for op in doc.operations.iter() {
        let (_name, def) = op;
        for selection_item in &def.node.selection_set.node.items {
            if let async_graphql::parser::types::Selection::Field(field) = &selection_item.node {
                query_fields.push(field.node.name.to_string());
            }
        }
    };
    query_fields
}

//wrap_slow_macros!{

#[derive(Serialize, Deserialize, Clone)]
pub struct IndexMapAGQL<K: std::hash::Hash + Eq, V>(pub IndexMap<K, V>);

// makes-so you can call functions on IndexMapAGQL as though it were an IndexMap (ie. without having to do .0)
impl<K: std::hash::Hash + Eq, V> std::ops::Deref for IndexMapAGQL<K, V> {
    type Target = IndexMap<K, V>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
impl<K: std::hash::Hash + Eq, V> std::ops::DerefMut for IndexMapAGQL<K, V> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}
// makes it a bit easier to go from IndexMap -> IndexMapAGQL
/*impl From<IndexMapAGQL<String, PermissionSet>> for IndexMap<String, PermissionSet> {
    fn from(val: IndexMapAGQL<String, PermissionSet>) -> Self {
        val.0
    }
}*/
// makes it a bit easier to go from IndexMap -> IndexMapAGQL
/*impl Into<IndexMapAGQL<String, PermissionSet>> for IndexMap<String, PermissionSet> {
    fn into(self) -> IndexMapAGQL<String, PermissionSet> {
        IndexMapAGQL(self)
    }
}*/

/// A scalar that can represent any JSON Object value.
#[Scalar(name = "JSONObject")]
impl<T> ScalarType for IndexMapAGQL<String, T> where T: OutputType + InputType {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::Object(map) => {
                let mut result = IndexMapAGQL(IndexMap::new());
                for (key, value) in map.into_iter() {
                    result.insert(key.to_string(), T::parse(Some(value)).map_err(InputValueError::propagate)?);
                }
                Ok(result)
            },
            _ => Err(InputValueError::expected_type(value)),
        }
    }

    fn to_value(&self) -> Value {
        let mut map = IndexMap::new();
        for (name, value) in self.iter() {
            map.insert(Name::new(name), value.to_value());
        }
        Value::Object(map)
    }
}

//}

#[cfg(test)]
mod tests {
    use rust_shared::async_graphql;

    use crate::utils::db::agql_ext::gql_utils::get_root_fields_in_doc;

    #[test]
    fn test_get_root_fields_in_doc() {
        let query = r#"
            query {
                subtree1(id: 1) {
                    id
                }
                subtree2(id: 1) {
                    id
                }
            }
        "#;
        let doc = async_graphql::parser::parse_query(query).unwrap();
        let root_fields = get_root_fields_in_doc(doc);
        assert_eq!(root_fields, vec!["subtree1", "subtree2"]);
    }
}
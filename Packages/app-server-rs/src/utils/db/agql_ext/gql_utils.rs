use rust_shared::async_graphql::{self, parser::types::ExecutableDocument};

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
use super::super::type_aliases::JSONValue;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct K8sSecret {
    pub apiVersion: String,
    pub data: JSONValue,
    pub metadata: JSONValue,
    pub kind: String,
    pub r#type: String,
}
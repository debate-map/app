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

/*{
	"apiVersion": "v1",
	"data": {
		"custom_field1": "custom_value1",
		"custom_field2": "custom_value2"
	},
    "metadata": {
        [...]
    },
	"kind": "Secret",
	"type": "Opaque"
}*/
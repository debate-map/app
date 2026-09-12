use serde::{Deserialize, Serialize};

use crate::utils::general::type_aliases::JSONValue;

#[derive(Serialize, Deserialize)]
pub struct K8sSecret {
	pub apiVersion: String,
	pub data: JSONValue,
	pub metadata: JSONValue,
	pub kind: String,
	pub r#type: String,
}

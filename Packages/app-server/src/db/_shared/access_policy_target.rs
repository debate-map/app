use rust_shared::{async_graphql::{self, ScalarType, InputValueResult, InputValueError, Scalar, Value}, utils::general_::extensions::ToOwnedV, serde_json};
use serde::{Serialize, Serializer, Deserialize, Deserializer};

use crate::db::access_policies_::_permission_set::APTable;

pub struct AccessPolicyTarget {
    pub policy_id: String,
    pub ap_table: APTable,
}
impl AccessPolicyTarget {
    pub fn new(access_policy: String, table: APTable) -> Self {
        Self { policy_id: access_policy, ap_table: table.o() }
    }
}

impl Clone for AccessPolicyTarget {
    fn clone(&self) -> Self {
        AccessPolicyTarget::new(self.policy_id.o(), self.ap_table)
    }
}
impl Serialize for AccessPolicyTarget {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> where S: Serializer {
        //serializer.serialize_str(self.inner.to_string().as_str())
        let str_val = format!("{}:{:?}", self.policy_id, self.ap_table);
        str_val.serialize(serializer)
    }
}
impl<'de> Deserialize<'de> for AccessPolicyTarget {
    fn deserialize<D>(deserializer: D) -> Result<AccessPolicyTarget, D::Error> where D: Deserializer<'de> {
        let str_val = String::deserialize(deserializer)?;
        let (policy_id, table_name) = str_val.split_once(":").ok_or_else(|| serde::de::Error::custom("AccessPolicyTarget must be in the format `access_policy_id:policy_subfield`"))?;

        // ensure that policy_id substring is a valid UUID/slugid
        // todo: probably change `policy_id` field to custom type that enforces this for itself
        if policy_id.len() != 22 {
            return Err(serde::de::Error::custom(format!("The policy-id within the access-policy-target must be a valid slugid; for example, its length must be 22 characters. Actual length:{}", policy_id.len())));
        }
        let table: APTable = serde_json::from_value(serde_json::Value::String(table_name.o())).map_err(|e| serde::de::Error::custom(format!("Failed to parse valid table-name from access-policy-target:{}", e)))?;
        
        Ok(AccessPolicyTarget::new(policy_id.o(), table))
    }
}

#[Scalar]
impl ScalarType for AccessPolicyTarget {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::String(str_val) => {
                //Ok(serde_json::from_str(&str_val).map_err(|e| InputValueError::custom(e))?)
                let (policy_id, table_name) = str_val.split_once(":").ok_or_else(|| InputValueError::custom("AccessPolicyTarget must be in the format `access_policy_id:policy_subfield`"))?;

                // ensure that policy_id substring is a valid UUID/slugid
                // todo: probably change `policy_id` field to custom type that enforces this for itself
                if policy_id.len() != 22 {
                    return Err(InputValueError::custom(format!("The policy-id within the access-policy-target must be a valid slugid; for example, its length must be 22 characters. Actual length:{}", policy_id.len())));
                }
                let table: APTable = serde_json::from_value(serde_json::Value::String(table_name.o())).map_err(|e| InputValueError::custom(format!("Failed to parse valid table-name from access-policy-target:{}", e)))?;
                
                Ok(AccessPolicyTarget::new(policy_id.o(), table))
            },
            _ => Err(InputValueError::custom("AccessPolicyTarget must be a string")),
        }
    }
    fn to_value(&self) -> Value {
        //Value::String(serde_json::to_string(&self).unwrap())
        let str_val = format!("{}:{:?}", self.policy_id, self.ap_table);
        Value::String(str_val)
    }
}
use rust_shared::{async_graphql::{self, Enum, SimpleObject, InputObject}, rust_macros::wrap_slow_macros, utils::{type_aliases::JSONValue, general_::serde::JSONValueV}, anyhow::Error};
use serde::{Serialize, Deserialize};

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "SourceChainInput")]
pub struct SourceChain {
	pub sources: Vec<Source>,
}

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum SourceType {
	#[graphql(name = "speech")] speech,
	#[graphql(name = "text")] text,
	#[graphql(name = "image")] image,
	#[graphql(name = "video")] video,
	#[graphql(name = "webpage")] webpage,
	#[graphql(name = "claimMiner")] claimMiner,
	#[graphql(name = "hypothesisAnnotation")] hypothesisAnnotation,
}

//export const Source_linkURLPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+$";

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "SourceInput")]
pub struct Source {
	pub r#type: SourceType,

	// uses with * means shown in the main row (rather than in dropdown)
	pub name: Option<String>,
	pub author: Option<String>,
	pub location: Option<String>,
	pub time_min: Option<f64>,
	pub time_max: Option<f64>,
	pub link: Option<String>,
    
	pub claimMinerID: Option<String>,
	pub hypothesisAnnotationID: Option<String>,
}

}

pub fn source_chains_from_old_json_data(data: Option<&JSONValue>) -> Result<Vec<SourceChain>, Error> {
    match data {
        Some(data) => {
            let mut result: Vec<SourceChain> = vec![];
            for source_chain_data in data.try_as_array()? {
                result.push(source_chain_from_old_json_data(source_chain_data)?);
            }
            Ok(result)
        },
        None => Ok(vec![]),
    }
}
pub fn source_chain_from_old_json_data(data: &JSONValue) -> Result<SourceChain, Error> {
    let sources: Vec<Source> = data.try_get("sources")?.try_as_array()?.iter().map(|source| {
        let source_type = match source["type"].as_i64().unwrap() {
            10 => SourceType::speech,
            20 => SourceType::text,
            30 => SourceType::image,
            40 => SourceType::video,
            50 => SourceType::webpage,
            _ => panic!("Invalid source type"),
        };
        Source {
            r#type: source_type,
            name: source.get("name").map(|a| a.as_string()).unwrap_or(None),
            author: source.get("author").map(|a| a.as_string()).unwrap_or(None),
            location: source.get("location").map(|a| a.as_string()).unwrap_or(None),
            time_min: source.get("time_min").map(|a| a.as_f64()).unwrap_or(None),
            time_max: source.get("time_max").map(|a| a.as_f64()).unwrap_or(None),
            link: source.get("link").map(|a| a.as_string()).unwrap_or(None),
            claimMinerID: None,
            hypothesisAnnotationID: None,
        }
    }).collect();
    Ok(SourceChain {
        sources,
    })
}
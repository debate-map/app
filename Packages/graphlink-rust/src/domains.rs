use std::env;

use anyhow::{ensure, Error};
use reqwest::Url;

use crate::utils::general::extensions::ToOwnedV;

pub fn get_env() -> String {
	env::var("ENVIRONMENT").unwrap_or("<unknown>".to_string())
}
pub fn is_dev() -> bool {
	get_env() == "dev"
}
pub fn is_prod() -> bool {
	get_env() == "prod"
}

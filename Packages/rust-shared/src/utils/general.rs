use std::{env, collections::HashMap};
use anyhow::{anyhow, Error};

use async_graphql::{EnumType, resolver_utils::enum_value};
use axum::http::Uri;

pub enum K8sEnv {
    Dev,
    Prod,
}
impl std::fmt::Debug for K8sEnv {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Dev => write!(f, "dev"),
            Self::Prod => write!(f, "prod"),
        }
    }
}

pub fn k8s_env() -> K8sEnv {
    match env::var("ENV").expect("An environment-variable named `ENV` must be provided, with value `dev` or `prod`.").as_str() {
        "dev" => K8sEnv::Dev,
        "prod" => K8sEnv::Prod,
        _ => panic!("The environment-variable named `ENV` must be either `dev` or `prod`."),
    }
}
pub fn k8s_dev() -> bool {
    match k8s_env() {
        K8sEnv::Dev => true,
        _ => false,
    }
}
pub fn k8s_prod() -> bool {
    match k8s_env() {
        K8sEnv::Prod => true,
        _ => false,
    }
}

pub fn get_uri_params(uri: &Uri) -> HashMap<String, String> {
    let params: HashMap<String, String> = uri.query()
        .map(|v| url::form_urlencoded::parse(v.as_bytes()).into_owned().collect())
        .unwrap_or_else(HashMap::new);
    params
}

pub fn as_debug_str(obj: &impl std::fmt::Debug) -> String {
    format!("{:?}", obj)
}
pub fn as_json_str<T: serde::Serialize>(obj: &T) -> Result<String, Error> {
    let as_json_value = serde_json::to_value(obj)?;
    let as_str = as_json_value.as_str().ok_or(anyhow!("The object did not serialize to a json string!"))?;
    Ok(as_str.to_owned())
}

// project-specific; basically all our enums have derive(Serialize), so use that for serialization
pub fn enum_to_string<T: serde::Serialize>(obj: &T) -> String {
    as_json_str(obj).unwrap()
}
/*pub fn enum_to_string<T: EnumType>(obj: T) -> String {
    enum_value(obj).to_string()
}*/

/*pub fn x_is_one_of<T: Eq + std::fmt::Debug + ?Sized>(x: &T, list: &[&T]) -> Result<(), Error> {
	for val in list {
		if val.eq(&x) {
			return Ok(());
		}
	}
	Err(anyhow!("Supplied value for field does not match any of the valid options:{:?}", list))
}*/

pub fn average(numbers: &[f64]) -> f64 {
    numbers.iter().sum::<f64>() as f64 / numbers.len() as f64
}

pub fn f64_to_str_rounded(val: f64, fraction_digits: usize) -> String {
    // see: https://stackoverflow.com/a/61101531
    format!("{:.1$}", val, fraction_digits)
}
pub fn f64_to_percent_str(f: f64, fraction_digits: usize) -> String {
    let val_as_percent = f * 100.0;
    format!("{}%", f64_to_str_rounded(val_as_percent, fraction_digits))
}

/*macro_rules! default(
    // Create a new T where T is known.
    // let x = default!(Foo, x:1);
    ($T:ident, $($k:ident: $v:expr), *) => (
        $T { $($k: $v), *, ..::std::default::Default::default() }
    );

    // Create a new T where T is known, but with defaults.
    // let x = default!(Foo);
    ($T:ident) => (
        $T { ..::std::default::Default::default() }
    );

    // Create a new T where T is not known.
    // let x: T = default!();
    () => (
        ::std::default::Default::default();
    );
);*/
use rust_shared::anyhow::{anyhow, Error};

pub fn err_should_be_populated(field_path: &str) -> Error {
    anyhow!(r#"The `{}` field should be populated at this point."#, field_path)
}
pub fn err_should_be_null(field_path: &str) -> Error {
    anyhow!(r#"The `{}` field should be null at this point."#, field_path)
}
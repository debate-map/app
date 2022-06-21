// work-in-progress; once the new Command system is worked out here in Rust, I'll start migrating the Command classes from app-server-js into it

use anyhow::Error;
use serde::Serialize;
use async_trait::async_trait;

use crate::{utils::type_aliases::JSONValue, db::general::accessor_helpers::AccessorContext};

pub struct UserInfo {
    pub id: String,
}

#[async_trait(?Send)]
pub trait Command {
    async fn Validate(&self, ctx: &AccessorContext<'_>) -> Result<JSONValue, Error>;
    fn Commit(&self, ctx: &AccessorContext<'_>) -> Result<(), Error>;
}

pub fn db_set<T: AsRef<str>, T2: Serialize>(ctx: &AccessorContext<'_>, path: &[T], value: T2) {
    // todo
}
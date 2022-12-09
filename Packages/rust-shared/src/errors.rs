use std::{fmt::{self, Debug}};
use anyhow::{anyhow};

use async_graphql::async_stream;
use futures::Stream;

/*pub fn to_anyhow<
    //T: std::error::Error
    T: ToString
>(err: T) -> anyhow::Error
    where T: Into<anyhow::Error> + Send + Sync
{
    anyhow!(err)
}
pub fn to_anyhow_with_extra<
    //T: std::error::Error
    T: ToString
>(err: T, extra: String) -> anyhow::Error
    where T: Into<anyhow::Error> + Send + Sync
{
    anyhow!(err.to_string() + "\n@extra:" + &extra)
}*/

pub fn to_anyhow<T: Debug>(err: T) -> anyhow::Error {
    anyhow!(format!("{:?}", err))
}
pub fn to_anyhow_with_extra<T: Debug>(err: T, extra: String) -> anyhow::Error {
    anyhow!(format!("{:?}", err) + "\n@extra:" + &extra)
}

// BasicError
// ==========

#[derive(Debug, Clone)]
pub struct BasicError {
    message: String,
}
impl BasicError {
    pub fn new(message: String) -> Self {
        Self { message }
    }
    pub fn boxed(message: String) -> Box<Self> {
        Box::new(Self::new(message))
    }
}

impl std::error::Error for BasicError {}

impl fmt::Display for BasicError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

// SubError (special one for async-graphql subscriptions)
// ==========

// Clone is needed for it to be used under async-graphql's `#[Subscription]` macro
#[derive(Debug, Clone)]
pub struct SubError {
    message: String,
}
impl SubError {
    pub fn new(message: String) -> Self {
        Self { message }
    }
}

/// Use like this:
/// ```
/// some_func().map_err(to_sub_err)?;
/// ```
/*pub fn to_sub_err(base_err: anyhow::Error) -> SubError {
    //SubError::new(base_err.to_string()) // this only provides the first line (in some cases anyway)
    SubError::new(format!("{:?}", base_err))
}*/

/// Use like this:
/// ```
/// some_func().map_err(to_sub_err)?;
/// ```
pub fn to_sub_err<T: Debug>(base_err: T) -> SubError {
    //SubError::new(base_err.to_string()) // this only provides the first line (in some cases anyway)
    SubError::new(format!("{:?}", base_err))
}

pub fn to_sub_err_in_stream<T0, T: Debug>(base_err: T) -> impl Stream<Item = Result<T0, SubError>> {
    async_stream::stream! {
        yield Err(to_sub_err(base_err))
    }
}

impl std::error::Error for SubError {}

impl fmt::Display for SubError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "SubError:{}", self.message)
    }
}
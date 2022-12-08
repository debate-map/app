use std::{error::Error, fmt::{self, Debug}};

use async_graphql::async_stream;
use futures::Stream;

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

impl Error for BasicError {}

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

impl Error for SubError {}

impl fmt::Display for SubError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "SubError:{}", self.message)
    }
}
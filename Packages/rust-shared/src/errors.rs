use std::{error::Error, fmt};

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

impl Error for SubError {}

impl fmt::Display for SubError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "SubError:{}", self.message)
    }
}
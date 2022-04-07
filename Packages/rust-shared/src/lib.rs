use std::{error::Error, fmt};

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
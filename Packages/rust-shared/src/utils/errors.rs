use anyhow::{anyhow, Error};
use std::fmt::{self, Debug, Display, Formatter};

use async_graphql::{async_stream, ErrorExtensions};
use futures::Stream;
use tracing::{
	log::{self, error},
	warn,
};

/// Use this as a "safer alternative" to `option.unwrap()`; it returns an error (as well as immediately `error!(...)` logging it) rather than panicking.
pub fn should_be_unreachable() -> anyhow::Error {
	let result = anyhow!("This code-path should be unreachable! However, to be safe, we're returning an error (and logging it) rather than panicking.");
	error!("{:?}", result);
	result
}

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
// todo: probably merge this with GQLError
// ==========

// Clone is needed for it to be used under async-graphql's `#[Subscription]` macro
#[derive(Debug, Clone)]
pub struct SubError {
	message: String,
}
impl SubError {
	pub fn new(message: String) -> Self {
		// When a SubError is constructed, immediately log it to the console, since async-graphql does not print it to the server's log itself (it only sends it to the client).
		// (ideally, we would do this in gql_general_extension.subscribe [cleaner, and more universal, eg. also catches syntax errors], but I haven't figured out how yet)
		log::warn!(target: "async-graphql", "[error in SubError/gql.subscribe] {:?}", anyhow!(message.clone())); // wrap in anyhow!, to get stacktrace

		Self { message }
	}
}
impl std::error::Error for SubError {}
impl fmt::Display for SubError {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		write!(f, "SubError:{}", self.message)
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
// commented for now; current use-cases are better just using with_context() earlier in-chain
/*pub fn to_sub_err_with_extra<T: Debug>(base_err: T, extra: String) -> SubError {
	SubError::new(format!("{:?}", base_err) + "\n@extra:" + &extra)
}*/

pub fn to_sub_err_in_stream<T0, T: Debug>(base_err: T) -> impl Stream<Item = Result<T0, SubError>> {
	async_stream::stream! {
		yield Err(to_sub_err(base_err))
	}
}

// graphql-error
// ==========

/// graphql-error (could alternately be called the "fully-baked error" type)
/// * An error-type that auto-wraps the base-error into an anyhow::Error (for backtrace info), then stringifies its full error info for repeating in its `impl Display`.
/// * Needed for use in async-graphql, where our logger extension wants backtrace data, but can only access the result of `error.to_string()` rather than the source error itself.
pub struct GQLError {
	full_error_info_string: String,
}
/*impl GQLError {
	pub fn new(full_error_info_string: String) -> Self {
		Self { full_error_info_string }
	}
}*/
impl Display for GQLError {
	fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
		write!(f, "{}", self.full_error_info_string)
	}
}
/*impl Debug for GQLError {
	fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
		write!(f, "{}", self.full_error_info_string)
	}
}*/
impl<E> From<E> for GQLError
where
	E: Into<anyhow::Error> + Send + Sync + 'static,
{
	fn from(error: E) -> Self {
		let as_anyhow_error_with_backtrace: anyhow::Error = error.into();
		/*for cause in as_anyhow_error_with_backtrace.chain() {
			warn!("New GQLError cause: {:?}", cause);
			/*if let Some(ref app_err) = cause.downcast_ref::<Error>() { // cast to AppError
				error!("New GQLError cause2:{:?}", app_err);
			}*/
		}
		warn!("New GQLError: {:?}", as_anyhow_error_with_backtrace);*/
		GQLError { full_error_info_string: format!("{:?}", as_anyhow_error_with_backtrace) }
	}
}

/// Use like this:
/// ```
/// some_func().map_err(to_gql_error)?;
/// ```
pub fn to_gql_err<T: Debug>(base_err: T) -> GQLError {
	//GQLError::new(base_err.to_string()) // this only provides the first line (in some cases anyway)
	//GQLError::new(format!("{:?}", base_err))
	GQLError { full_error_info_string: format!("{:?}", base_err) }
}

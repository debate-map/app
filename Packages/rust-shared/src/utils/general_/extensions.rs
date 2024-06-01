use std::{
	fmt,
	num::TryFromIntError,
	ops::{Residual, Try},
};

use crate::utils::errors_::backtrace_simplifier::simplify_backtrace_str;

pub type ChangeOutputType<T, V> = <<T as Try>::Residual as Residual<V>>::TryType;

// commented in favor of `.o()` (seen below), as that communicates the "narrowness of the intended application" better (ie. for &str->String conversions, not as a general-purpose "to_string" method)
/*pub trait ToStringV : ToString {
	/// Simply an alias for `.to_string()`.
	fn s(&self) -> String {
		self.to_string()
	}
}
impl<T> ToStringV for T where T: ToString {}*/

pub trait ToOwnedV
where
	Self: ToOwned,
{
	/// Simply an alias for `.to_owned()`.
	fn o(&self) -> <Self as ToOwned>::Owned {
		self.to_owned()
	}
}
impl<T: ?Sized> ToOwnedV for T where T: ToOwned {}

pub trait IteratorV: Iterator {
	/// Alias for `core::iter::Iterator::try_collect` (needed for when import of itertools "shadows" that core implementation, which I prefer)
	fn try_collect2<B>(&mut self) -> ChangeOutputType<Self::Item, B>
	where
		Self: Sized,
		Self::Item: Try,
		<Self::Item as Try>::Residual: Residual<B>,
		B: FromIterator<<Self::Item as Try>::Output>,
	{
		core::iter::Iterator::try_collect::<B>(self)
	}

	// figure out the type-definition for this someday, lol
	/*fn try_collect_vec<B>(&mut self) -> ChangeOutputType<Self::Item, B>
	where
		Self: Sized,
		Self::Item: Try,
		<Self::Item as Try>::Residual: Residual<B>,
		B: FromIterator<<Self::Item as Try>::Output>,
	{
		core::iter::Iterator::try_collect::<Vec<B>>(self)
	}*/
}
impl<T: ?Sized> IteratorV for T where T: Iterator {}

// this doesn't work, since Result is an enum, not a trait
/*pub trait ResultV<T, E> : Result<T, E> {
	fn expect_lazy<F: FnOnce(E) -> String>(self, msg_getter: F) -> T
	where
		E: fmt::Debug
	{
		match self {
			Ok(t) => t,
			Err(err) => {
				let e_str = format!("{err:?}");
				let msg = msg_getter(err);
				panic!("{}: {}", msg, e_str);
			},
		}
	}
}
impl<T, E> ResultV<T, E> for Result<T, E> { }*/

pub trait ResultV<T, E> {
	fn expect_lazy<F: FnOnce(E) -> String>(self, msg_getter: F) -> T
	where
		E: fmt::Debug;
}
impl<T, E> ResultV<T, E> for Result<T, E> {
	fn expect_lazy<F: FnOnce(E) -> String>(self, msg_getter: F) -> T
	where
		E: fmt::Debug,
	{
		match self {
			Ok(t) => t,
			Err(err) => {
				let err_str = format!("{err:?}");
				let err_str_simplified = simplify_backtrace_str(err_str, true);
				let msg = msg_getter(err);
				panic!("{}\n\t@base_error:{}", msg, indent_all_lines(&err_str_simplified, 1));
			},
		}
	}
}

pub fn indent_all_lines(from_str: &str, indent_amount: usize) -> String {
	let lines = from_str.split("\n");
	let lines_indented: Vec<String> = lines.map(|line| "\t".repeat(indent_amount) + line).collect();
	lines_indented.join("\n")
}

// trait that lets one do myVec.len_u32() to get a u32 (with panic if the length is too big)
pub trait VecLenU32 {
	fn len_u32(&self) -> u32;
	fn len_u64(&self) -> u64;
	fn try_len_u32(&self) -> Result<u32, TryFromIntError>;
}
impl<T> VecLenU32 for Vec<T> {
	fn len_u32(&self) -> u32 {
		self.len().try_into().expect("Vec length is too big to convert to u32")
	}
	// atm this is safe, since usize cannot be larger than u64 (rust doesn't support 128bit+ architectures atm)
	fn len_u64(&self) -> u64 {
		let len = self.len();
		len as u64
	}

	fn try_len_u32(&self) -> Result<u32, TryFromIntError> {
		//self.len().try_into().map_err(anyhow!("Vec length is too big to convert to u32"))
		self.len().try_into()
	}
}

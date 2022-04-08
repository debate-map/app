use std::{ops::{Residual, Try}, fmt};

pub type ChangeOutputType<T, V> = <<T as Try>::Residual as Residual<V>>::TryType;

pub trait IteratorV : Iterator {
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
impl<T: ?Sized> IteratorV for T where T: Iterator { }

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
        E: fmt::Debug
    {
        match self {
            Ok(t) => t,
            Err(err) => {
                let e_str = format!("{err:?}");
                let msg = msg_getter(err);
                panic!("{}\n\t@base_error:{}", msg, indent_all_lines(&e_str, 1));
            },
        }
    }
}

pub fn indent_all_lines(from_str: &str, indent_amount: usize) -> String {
    let lines = from_str.split("\n");
    let lines_indented: Vec<String> = lines.map(|line| {
        "\t".repeat(indent_amount) + line
    }).collect();
    lines_indented.join("\n")
}
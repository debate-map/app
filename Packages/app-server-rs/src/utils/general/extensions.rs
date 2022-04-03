use std::ops::{Residual, Try};

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
}
impl<T: ?Sized> IteratorV for T where T: Iterator { }
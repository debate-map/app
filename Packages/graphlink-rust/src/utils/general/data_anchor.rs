/// This "data anchor" struct helps expand function-based encapsulation to more cases:
/// * Those where you want to construct object X in a function, then construct a derivative/ref-using object Y and return it, without hitting Rust borrow-checker errors from object X's lifetime ending in that function.
///
/// With this "data anchor", you can easily construct a longer-persistence "container" for that object X, without needing to know the exact shape of data needed, nor having to pass the same arguments in two places.
/// See here for more info (both the linked answer, and the rest of the question/answers): https://stackoverflow.com/a/72925407
pub struct DataAnchor<T1, T2, T3> {
	pub val1: Option<T1>,
	pub val2: Option<T2>,
	pub val3: Option<T3>,
}
impl<T1, T2, T3> DataAnchor<T1, T2, T3> {
	pub fn empty() -> Self {
		Self { val1: None, val2: None, val3: None }
	}
	pub fn holding1(val1: T1) -> Self {
		Self { val1: Some(val1), val2: None, val3: None }
	}
	pub fn holding2(val1: T1, val2: T2) -> Self {
		Self { val1: Some(val1), val2: Some(val2), val3: None }
	}
	pub fn holding3(val1: T1, val2: T2, val3: T3) -> Self {
		Self { val1: Some(val1), val2: Some(val2), val3: Some(val3) }
	}
}
pub type DataAnchorFor3<T1, T2, T3> = DataAnchor<T1, T2, T3>;
pub type DataAnchorFor2<T1, T2> = DataAnchor<T1, T2, bool>;
pub type DataAnchorFor1<T1> = DataAnchor<T1, bool, bool>;

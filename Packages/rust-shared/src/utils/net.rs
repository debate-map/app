use std::borrow::Cow;

use bytes::Bytes;
use http_body_util::Full;

pub fn full_body_from_str(str_cow: impl Into<Cow<'static, str>> + ToString) -> Full<Bytes> {
    let str = str_cow.to_string();
    let bytes = Bytes::from(str);
    Full::new(bytes)
}
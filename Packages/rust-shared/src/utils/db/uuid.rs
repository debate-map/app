use anyhow::Error;
use async_graphql::ID;
use base64::URL_SAFE_NO_PAD;
use uuid::{Bytes, Uuid};

pub fn uuid_to_b64(id: Uuid) -> String {
	let bytes = id.as_bytes();

	/*let mut str = base64::encode(bytes);
	// remove the "==" at the end
	str.pop();
	str.pop();*/
	let str = base64::encode_config(bytes, URL_SAFE_NO_PAD);

	return str;
}
fn bytes_slice_as_16_length(bytes: &[u8]) -> Result<[u8; 16], Error> {
	let bytes_len16: [u8; 16] = bytes.try_into()?;
	Ok(bytes_len16)
}
pub fn uuid_from_b64(str: String) -> Result<Uuid, Error> {
	/*let mut str_full = str;
	// add the "==" at the end, for it to be a proper base64 string
	str_full += "==";
	let bytes = base64::decode(str_full)?;*/
	let bytes = base64::decode_config(str, URL_SAFE_NO_PAD)?;

	let bytes_len16 = bytes_slice_as_16_length(&bytes)?;
	return Ok(Uuid::from_bytes(bytes_len16));
}

// higher-level functions
// ==========

pub fn new_uuid_v4_as_b64() -> String {
	let uuid = Uuid::new_v4();
	uuid_to_b64(uuid)
}
pub fn new_uuid_v4_as_b64_id() -> ID {
	ID(new_uuid_v4_as_b64())
}

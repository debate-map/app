#[derive(Debug)]
pub struct APActionDef {
	pub name: String,
}
impl APActionDef {
	pub fn new(name: &str) -> Self {
		Self { name: name.to_string() }
	}
}

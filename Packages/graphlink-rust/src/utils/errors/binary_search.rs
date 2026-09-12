pub fn binary_search_insert<T>(vec: &mut Vec<T>, item: T, cmp: impl Fn(&T, &T) -> std::cmp::Ordering) {
	let pos = vec.binary_search_by(|probe| cmp(probe, &item)).unwrap_or_else(|x| x);
	vec.insert(pos, item);
}
pub fn binary_search_replace<T>(vec: &mut Vec<T>, item: T, cmp: impl Fn(&T, &T) -> std::cmp::Ordering) -> Option<T> {
	let pos = vec.binary_search_by(|probe| cmp(probe, &item)).ok()?;
	Some(std::mem::replace(&mut vec[pos], item))
}
pub fn binary_search_remove<T>(vec: &mut Vec<T>, item: &T, cmp: impl Fn(&T, &T) -> std::cmp::Ordering) -> Option<T> {
	let pos = vec.binary_search_by(|probe| cmp(probe, item)).ok()?;
	Some(vec.remove(pos))
}

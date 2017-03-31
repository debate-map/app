export function GetPathL1() {
	let location = State().router.location;
	if (location == null) return "/";
	return location.pathname.split("/")[1];
}
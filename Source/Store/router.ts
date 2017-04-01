import {GetUrlPath, GetUrlVars} from "../Frame/General/Globals_Free";

export function GetPathL1() {
	/*let location = State().router.location;
	if (location == null) return "/";
	return location.pathname.split("/")[1];*/

	let pathname = GetUrlPath();
	return pathname.split("/")[0];
}
/*export function GetQueryStr() {
	let pathname = GetUrlVars();
	return pathname.split("/")[0];
}*/
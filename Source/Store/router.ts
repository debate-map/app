import {GetUrlPath, GetUrlVars} from "../Frame/General/Globals_Free";
import {rootPages, rootPageDefaultChilds} from "../UI/Root";

export function GetPathNodes(path = GetUrlPath(), makeFull = true) {
	/*let location = State().router.location;
	if (location == null) return "/";
	return location.pathname.split("/")[1];*/
	
	let pathNodes = path.split("/").Where(a=>a.length > 0);
	if (makeFull) {
		if (!rootPages.Contains(pathNodes[0]))
			pathNodes.Insert(0, "home");
		if (pathNodes[1] == null)
			pathNodes.Insert(1, rootPageDefaultChilds[pathNodes[0]]);
	}
	return pathNodes;
}
export function GetPath(path = GetUrlPath(), makeFull = true) {
	return GetPathNodes(path, makeFull).join("/");
}
/*export function GetPathL1(makeFull = false) {
	return GetPath().split("/")[0];
}
export function GetPathL2(makeFull = false) {
	return GetPath().split("/")[1] || "";
}*/

/*export function GetQueryStr() {
	let pathname = GetUrlVars();
	return pathname.split("/")[0];
}*/
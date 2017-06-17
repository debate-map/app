import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {ViewedNodeSet} from "./userViewedNodes/@ViewedNodeSet";

export function GetUserViewedNodes(userID: string) {
	if (userID == null) return null;
	return GetData(`userViewedNodes/${userID}`) as ViewedNodeSet;
}
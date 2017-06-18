import { GetData, GetData_Options } from "../../Frame/Database/DatabaseHelpers";
import {ViewedNodeSet} from "./userViewedNodes/@ViewedNodeSet";

export function GetUserViewedNodes(userID: string, options?: GetData_Options) {
	if (userID == null) return null;
	return GetData(`userViewedNodes/${userID}`, options) as ViewedNodeSet;
}
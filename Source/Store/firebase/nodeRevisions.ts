import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {MapNodeRevision} from "./nodes/@MapNodeRevision";

export function GetNodeRevision(id: number) {
	if (id == null || IsNaN(id)) return null;
	return GetData("nodeRevisions", id) as MapNodeRevision;
}
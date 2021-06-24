import {emptyArray, GetValues_ForSchema} from "web-vcore/nm/js-vextensions";
import {AddSchema, DB, MGLClass, Field, GetDoc, StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {ChangeType, Map_NodeEdit} from "./mapNodeEdits/@MapNodeEdit.js";

const colorMap = {
	[ChangeType.Add]: "0,255,0",
	// [ChangeType.Edit]: "255,255,0",
	[ChangeType.Edit]: "255,255,0",
	[ChangeType.Remove]: "255,0,0",
};
export function GetChangeTypeOutlineColor(changeType: ChangeType) {
	if (changeType == null) return null;
	return colorMap[changeType];
}

export const GetMapNodeEdit = StoreAccessor(s=>(id: string)=>{
	return GetDoc({}, a=>a.mapNodeEdits.get(id)) as Map_NodeEdit;
});
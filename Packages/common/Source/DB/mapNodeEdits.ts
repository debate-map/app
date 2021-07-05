import {emptyArray, GetValues_ForSchema} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, DB, MGLClass, Field, GetDoc, CreateAccessor, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {ChangeType, Map_NodeEdit} from "./mapNodeEdits/@MapNodeEdit.js";

const colorMap = {
	[ChangeType.add]: "0,255,0",
	// [ChangeType.Edit]: "255,255,0",
	[ChangeType.edit]: "255,255,0",
	[ChangeType.remove]: "255,0,0",
};
export function GetChangeTypeOutlineColor(changeType: ChangeType|n) {
	if (changeType == null) return null;
	return colorMap[changeType];
}

export const GetMapNodeEdit = CreateAccessor(c=>(id: string)=>{
	return GetDoc({}, a=>a.mapNodeEdits.get(id)) as Map_NodeEdit;
});
export const GetMapNodeEdits = CreateAccessor(c=>(mapID: string)=>{
	return GetDocs({
		params: {filter: {
			map: {equalTo: mapID},
		}}
	}, a=>a.mapNodeEdits);
});
import chroma from "chroma-js";
import {emptyArray, GetValues_ForSchema} from "js-vextensions";
import {AddSchema, DB, MGLClass, Field, GetDoc, CreateAccessor, GetDocs} from "mobx-graphlink";
import {ChangeType, MapNodeEdit} from "./mapNodeEdits/@MapNodeEdit.js";

const colorMap = {
	[ChangeType.add]: "rgb(0,255,0)",
	[ChangeType.edit]: "rgb(255,180,0)",
	[ChangeType.remove]: "rgb(255,0,0)",
};
export function GetChangeTypeOutlineColor(changeType: ChangeType|n) {
	if (changeType == null) return null;
	return chroma(colorMap[changeType]);
}

export const GetMapNodeEdit = CreateAccessor((id: string)=>{
	return GetDoc({}, a=>a.mapNodeEdits.get(id)) as MapNodeEdit;
});
export const GetMapNodeEdits = CreateAccessor((mapID?: string|n, nodeID?: string|n)=>{
	return GetDocs({
		params: {filter: {
			map: mapID && {equalTo: mapID},
			node: nodeID && {equalTo: nodeID},
		}},
	}, a=>a.mapNodeEdits);
});
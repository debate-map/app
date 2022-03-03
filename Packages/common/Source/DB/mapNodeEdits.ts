import chroma from "web-vcore/nm/chroma-js.js";
import {emptyArray, GetValues_ForSchema} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, DB, MGLClass, Field, GetDoc, CreateAccessor, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {ChangeType, Map_NodeEdit} from "./mapNodeEdits/@MapNodeEdit.js";

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
	return GetDoc({}, a=>a.mapNodeEdits.get(id)) as Map_NodeEdit;
});
export const GetMapNodeEdits = CreateAccessor((mapID?: string|n, nodeID?: string|n)=>{
	return GetDocs({
		params: {filter: {
			map: mapID && {equalTo: mapID},
			node: nodeID && {equalTo: nodeID},
		}},
	}, a=>a.mapNodeEdits);
});
import {emptyArray, CE} from "web-vcore/nm/js-vextensions";
import {AddSchema, UUID_regex} from "web-vcore/nm/mobx-graphlink";
import {GetDoc, StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {MapNode} from "./nodes/@MapNode";
import {GetRootNodeID} from "./maps/$map";
import {GetNode, GetNodeID} from "./nodes";
import {SearchUpFromNodeForNodeMatchingX} from "../../Utils/Store/PathFinder";

export class NodeEditTimes {
	// [key: number]: ChangeInfo;
	[key: string]: number;
}
AddSchema("NodeEditTimes", {
	patternProperties: {[UUID_regex]: {type: "number"}},
});

export enum ChangeType {
	Add = 10,
	Edit = 20,
	Remove = 30,
}
/* export class ChangeInfo {
	type: ChangeType;
	time: number;
} */

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

export const GetMapNodeEditTimes = StoreAccessor(s=>(mapID: string)=>{
	return GetDoc({}, a=>a.mapNodeEditTimes.get(mapID)) as NodeEditTimes;
});
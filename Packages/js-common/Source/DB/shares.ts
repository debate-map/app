import {GetDoc, CreateAccessor, GetDocs} from "mobx-graphlink";
import {Share} from "./shares/@Share.js";

export const GetShare = CreateAccessor((id: string): Share|n=>{
	if (id == null) return null;
	return GetDoc({}, a=>a.shares.get(id));
});
export const GetShares = CreateAccessor((userID: string, mapID?: string|n): Share[]=>{
	return GetDocs({
		/*queryOps: [
			new WhereOp("creator", "==", userID),
			mapID && new WhereOp("mapID", "==", mapID),
		].filter(a=>a),*/
		params: {filter: {
			creator: {equalTo: userID},
			mapID: mapID && {equalTo: mapID},
		}},
	}, a=>a.shares);
});
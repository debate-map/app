import {GetDoc, StoreAccessor, GetDocs, WhereOp} from "../../../Commands/node_modules/mobx-firelink";
import {Share} from "./shares/@Share";

export const GetShare = StoreAccessor(s=>(id: string): Share=>{
	if (id == null) return null;
	return GetDoc({}, a=>a.shares.get(id));
});
export const GetShares = StoreAccessor(s=>(userID: string, mapID?: string): Share[]=>{
	return GetDocs({
		queryOps: [
			new WhereOp("creator", "==", userID),
			mapID && new WhereOp("mapID", "==", mapID),
		].filter(a=>a),
	}, a=>a.shares);
});
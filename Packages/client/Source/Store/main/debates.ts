import {O} from "web-vcore";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetMap} from "dm_common";
import {makeObservable} from "web-vcore/nm/mobx";

export class DebatesPageState {
	constructor() { makeObservable(this); }
	@O listType = "featured" as "featured" | "all";
	@O selectedMapID: string|n;
}

export const GetSelectedDebatesPageMapID = CreateAccessor({ctx: 1}, function() {
	return this.store.main.debates.selectedMapID;
});
export const GetSelectedDebatesPageMap = CreateAccessor(()=>{
	//const selectedID = this!.store.main.debates.selectedMapID;
	const selectedID = GetSelectedDebatesPageMapID();
	// return GetData(`maps/${selectedID}`);
	// return (GetMapsOfType(MapType.Debate) || []).find(a=>a._id == selectedID);
	return GetMap(selectedID);
});
import {O} from "web-vcore";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetMap} from "dm_common";

export class DebatesPageState {
	@O listType = "featured" as "featured" | "all";
	@O selectedMapID: string|n;
}

export const GetSelectedDebatesPageMap = CreateAccessor(c=>()=>{
	const selectedID = c.store.main.debates.selectedMapID;
	// return GetData(`maps/${selectedID}`);
	// return (GetMapsOfType(MapType.Debate) || []).find(a=>a._id == selectedID);
	return GetMap(selectedID);
});
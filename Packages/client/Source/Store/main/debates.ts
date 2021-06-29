import {O} from "web-vcore";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetMap} from "dm_common";

export class DebatesPageState {
	@O listType = "featured" as "featured" | "all";
	@O selectedMapID: string;
}

export const GetSelectedDebatesPageMap = StoreAccessor(s=>()=>{
	const selectedID = s.main.debates.selectedMapID;
	// return GetData(`maps/${selectedID}`);
	// return (GetMapsOfType(MapType.Debate) || []).find(a=>a._id == selectedID);
	return GetMap(selectedID);
});
import {O} from "web-vcore";
import {CreateAccessor} from "mobx-graphlink";
import {GetMap} from "dm_common";
import {ignore} from "mobx-sync";

export class DebatesPageState {
	@O accessor listType = "featured" as "featured" | "all";
	@O accessor selectedMapID: string|n;
	// path after the selected map's root node, used by crawler map-slice routes.
	@O @ignore accessor focusedNodePath: string|n;
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

import {O} from "web-vcore";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {GetMap} from "dm_common";

export class PublicPageState {
	@O listType = "featured" as "featured" | "all";
	@O selectedMapID: string;
}

export const GetSelectedPublicMap = StoreAccessor(s=>()=>{
	const selectedID = s.main.public.selectedMapID;
	// return GetData(`maps/${selectedID}`);
	// return (GetMapsOfType(MapType.Debate) || []).find(a=>a._id == selectedID);
	return GetMap(selectedID);
});
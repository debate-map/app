import {O} from "vwebapp-framework";
import {GetMap} from "Store/firebase/maps";
import {StoreAccessor} from "mobx-firelink";

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
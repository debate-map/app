import {O} from "vwebapp-framework";
import {StoreAccessor, GetDoc} from "mobx-firelink";
import {GetTerms, GetMedias, FirebaseDBShape} from "@debate-map/server-link/Source/Link";

export class DatabaseState {
	@O subpage: "users" | "terms" | "media";
	@O selectedUserID: string;
	@O selectedTermID: string;
	// @O selectedTermComponentID: string;
	@O selectedMediaID: string;
}

export const GetSelectedUserID = StoreAccessor(s=>()=>{
	return s.main.database.selectedUserID;
});
export const GetSelectedUser = StoreAccessor(s=>()=>{
	const selectedID = GetSelectedUserID();
	return GetDoc({}, a=>a.users.get(selectedID));
});

export const GetSelectedTermID = StoreAccessor(s=>()=>{
	return s.main.database.selectedTermID;
});
export const GetSelectedTerm = StoreAccessor(s=>()=>{
	const selectedID = GetSelectedTermID();
	// return GetData(`terms/${selectedID}`);
	return (GetTerms() || []).find(a=>a && a._key == selectedID);
});
/* export function GetSelectedTermComponent() {
	let selectedID = State().main.selectedTermComponent;
	return GetTermComponent(selectedID);
} */

export const GetSelectedMediaID = StoreAccessor(s=>()=>{
	return s.main.database.selectedMediaID;
});
export const GetSelectedMedia = StoreAccessor(s=>()=>{
	const selectedID = GetSelectedMediaID();
	// return GetData(`terms/${selectedID}`);
	return (GetMedias() || []).find(a=>a && a._key == selectedID);
});
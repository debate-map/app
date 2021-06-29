import {O} from "web-vcore";
import {StoreAccessor, GetDoc} from "web-vcore/nm/mobx-graphlink.js";
import {GetTerms, GetMedias, GraphDBShape} from "dm_common";

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
	return (GetTerms() || []).find(a=>a && a.id == selectedID);
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
	return (GetMedias() || []).find(a=>a && a.id == selectedID);
});
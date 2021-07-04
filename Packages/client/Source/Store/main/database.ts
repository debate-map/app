import {O} from "web-vcore";
import {CreateAccessor, GetDoc} from "web-vcore/nm/mobx-graphlink.js";
import {GetTerms, GetMedias, GraphDBShape} from "dm_common";

export class DatabaseState {
	@O subpage: "users" | "terms" | "media";
	@O selectedUserID: string|n;
	@O selectedTermID: string|n;
	//@O selectedTermComponentID: string|n;
	@O selectedMediaID: string|n;
}

export const GetSelectedUserID = CreateAccessor(c=>()=>{
	return c.store.main.database.selectedUserID;
});
export const GetSelectedUser = CreateAccessor(c=>()=>{
	const selectedID = GetSelectedUserID();
	return GetDoc({}, a=>a.users.get(selectedID!));
});

export const GetSelectedTermID = CreateAccessor(c=>()=>{
	return c.store.main.database.selectedTermID;
});
export const GetSelectedTerm = CreateAccessor(c=>()=>{
	const selectedID = GetSelectedTermID();
	// return GetData(`terms/${selectedID}`);
	return (GetTerms() || []).find(a=>a && a.id == selectedID);
});
/* export function GetSelectedTermComponent() {
	let selectedID = State().main.selectedTermComponent;
	return GetTermComponent(selectedID);
} */

export const GetSelectedMediaID = CreateAccessor(c=>()=>{
	return c.store.main.database.selectedMediaID;
});
export const GetSelectedMedia = CreateAccessor(c=>()=>{
	const selectedID = GetSelectedMediaID();
	// return GetData(`terms/${selectedID}`);
	return (GetMedias() || []).find(a=>a && a.id == selectedID);
});
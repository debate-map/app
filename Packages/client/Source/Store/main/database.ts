import {O} from "web-vcore";
import {CreateAccessor, GetDoc} from "web-vcore/nm/mobx-graphlink.js";
import {GetTerms, GetMedias, GraphDBShape, GetUser, GetAccessPolicy, GetTerm, GetMedia} from "dm_common";

export class DatabaseState {
	@O subpage: "users" | "policies" | "terms" | "media";
	@O selectedUserID: string|n;
	@O selectedTermID: string|n;
	//@O selectedTermComponentID: string|n;
	@O selectedMediaID: string|n;
	@O selectedPolicyID: string|n;
}

export const GetSelectedUserID = CreateAccessor(c=>()=>{
	return c.store.main.database.selectedUserID;
});
export const GetSelectedUser = CreateAccessor(c=>()=>{
	return GetUser(GetSelectedUserID());
});

export const GetSelectedTermID = CreateAccessor(c=>()=>{
	return c.store.main.database.selectedTermID;
});
export const GetSelectedTerm = CreateAccessor(c=>()=>{
	return GetTerm(GetSelectedTermID());
});
/*export function GetSelectedTermComponent() {
	let selectedID = State().main.selectedTermComponent;
	return GetTermComponent(selectedID);
}*/

export const GetSelectedMediaID = CreateAccessor(c=>()=>{
	return c.store.main.database.selectedMediaID;
});
export const GetSelectedMedia = CreateAccessor(c=>()=>{
	return GetMedia(GetSelectedMediaID());
});

export const GetSelectedPolicyID = CreateAccessor(c=>()=>{
	return c.store.main.database.selectedPolicyID;
});
export const GetSelectedPolicy = CreateAccessor(c=>()=>{
	return GetAccessPolicy(GetSelectedPolicyID());
});
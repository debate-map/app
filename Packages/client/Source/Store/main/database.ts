import {O} from "web-vcore";
import {AccessorCallPlan, CreateAccessor, GetDoc} from "mobx-graphlink";
import {GetTerms, GetMedias, GraphDBShape, GetUser, GetAccessPolicy, GetTerm, GetMedia} from "dm_common";

export class DatabaseState {
	@O accessor subpage: "users" | "policies" | "terms" | "media" | "subscriptions";
	@O accessor selectedUserID: string|n;
	@O accessor selectedTermID: string|n;
	//@O accessor selectedTermComponentID: string|n;
	@O accessor selectedMediaID: string|n;
	@O accessor selectedPolicyID: string|n;
}

export const GetSelectedUserID = CreateAccessor({ctx: 1}, function() {
	return this.store.main.database.selectedUserID;
});
export const GetSelectedUser = CreateAccessor(()=>{
	return GetUser(GetSelectedUserID());
});

export const GetSelectedTermID = CreateAccessor({ctx: 1}, function() {
	return this.store.main.database.selectedTermID;
});
export const GetSelectedTerm = CreateAccessor(()=>{
	return GetTerm(GetSelectedTermID());
});
/*export function GetSelectedTermComponent() {
	let selectedID = State().main.selectedTermComponent;
	return GetTermComponent(selectedID);
}*/

export const GetSelectedMediaID = CreateAccessor({ctx: 1}, function() {
	return this.store.main.database.selectedMediaID;
});
export const GetSelectedMedia = CreateAccessor(()=>{
	return GetMedia(GetSelectedMediaID());
});

export const GetSelectedPolicyID = CreateAccessor({ctx: 1}, function() {
	return this.store.main.database.selectedPolicyID;
});
export const GetSelectedPolicy = CreateAccessor(()=>{
	return GetAccessPolicy(GetSelectedPolicyID());
});
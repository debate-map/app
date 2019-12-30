import {GetUsers} from "Store/firebase/users";
import {O} from "vwebapp-framework";
import {StoreAccessor} from "mobx-firelink";
import {GetImages} from "../../Store/firebase/images";
import {GetTerms} from "../../Store/firebase/terms";

export class DatabaseState {
	@O subpage: string;
	@O selectedUserID: string;
	@O selectedTermID: string;
	// @O selectedTermComponentID: string;
	@O selectedImageID: string;
}

export const GetSelectedUserID = StoreAccessor(s=>()=>{
	return s.main.database.selectedUserID;
});
export const GetSelectedUser = StoreAccessor(s=>()=>{
	const selectedID = GetSelectedUserID();
	return (GetUsers() || []).find(a=>a && a._key == selectedID);
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

export const GetSelectedImageID = StoreAccessor(s=>()=>{
	return s.main.database.selectedImageID;
});
export const GetSelectedImage = StoreAccessor(s=>()=>{
	const selectedID = GetSelectedImageID();
	// return GetData(`terms/${selectedID}`);
	return (GetImages() || []).find(a=>a && a._key == selectedID);
});
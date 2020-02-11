import {autorun} from "mobx";
import {store} from "Source/Store";
import {DBPath, GetAsync, GetDoc} from "mobx-firelink";
import {fire} from "../../../Subrepos/Server/Source/@Shared/MobXFirelink";
import {GetUser} from "../../../Subrepos/Server/Source/@Shared/Store/firebase/users";
import {GetUser_Private} from "../../../Subrepos/Server/Source/@Shared/Store/firebase/users_private";
import {SetUserData} from "../../../Subrepos/Server/Source/@Shared/Commands/SetUserData";
import {SetUserData_Private} from "../../../Subrepos/Server/Source/@Shared/Commands/SetUserData_Private";

let lastUserInfo;
autorun(()=>{
	if (fire.userInfo != lastUserInfo) {
		lastUserInfo = fire.userInfo;
		if (fire.userInfo) {
			RunSignUpInitIfNotYetRun(fire.userInfo.id);
		}
	}
}, {name: "UserSignUpHelper"});

async function RunSignUpInitIfNotYetRun(userID: string) {
	//const user = await GetAsync(()=>GetDoc({undefinedForLoading: true}, a=>a.users.get(userID)));
	const user = await GetAsync(()=>GetUser(userID));
	if (user == null) {
		/*fire.subs.firestoreDB.doc(DBPath({}, `users/${userID}`)).set({
			permissionGroups: {basic: true, verified: true, mod: false, admin: false},
			joinDate: Date.now(),
		}, {merge: true});*/
		await new SetUserData({id: userID, updates: {
			displayName: fire.userInfo_raw.displayName,
			photoURL: fire.userInfo_raw.photoURL,
			// custom
			joinDate: Date.now(),
			permissionGroups: {basic: true, verified: true, mod: false, admin: false},
		}}).Run();
	}
	const user_p = await GetAsync(()=>GetUser_Private(userID));
	if (user_p == null) {
		await new SetUserData_Private({id: userID, updates: {
			email: fire.userInfo_raw.email,
			providerData: fire.userInfo_raw.providerData,
		}}).Run();
	}

	// Raven.setUserContext(action["auth"].Including("uid", "displayName", "email"));
}
import {autorun} from "mobx";
import {store} from "Store";
import {DBPath, GetAsync} from "mobx-firelink";
import {fire} from "Utils/LibIntegrations/MobXFirelink";
import {GetUserExtraInfo} from "Store/firebase/users";

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
	const joinDate = (await GetAsync(()=>GetUserExtraInfo(userID)))?.joinDate;
	if (joinDate == null) {
		// todo: improve this; perhaps create an InitUser command, with the server doing the actual permission setting and such
		/* const firebase = store.firebase.helpers;
		firebase.ref(DBPath(`userExtras/${userID}`)).update({
			permissionGroups: { basic: true, verified: true, mod: false, admin: false },
			joinDate: Date.now(),
		}); */
		fire.subs.firestoreDB.doc(DBPath({}, `userExtras/${userID}`)).set({
			permissionGroups: {basic: true, verified: true, mod: false, admin: false},
			joinDate: Date.now(),
		}, {merge: true});
	}

	// Raven.setUserContext(action["auth"].Including("uid", "displayName", "email"));
}
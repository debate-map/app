import {dbVersion, hasHotReloaded} from "Main";
import {RootState, store} from "Store";
import {GetAuth} from "Store/firebase";
import {GetUserPermissionGroups, Me, MeID} from "Store/firebase/users";
import {NotificationMessage} from "Store/main";
import {logTypes, LogTypes_New} from "Utils/General/Logging";
import {ValidateDBData} from "Utils/Store/DBDataValidator";
import {DoesURLChangeCountAsPageChange, GetLoadActionFuncForURL, GetNewURL} from "Utils/URL/URLs";
import {manager as manager_framework, ActionFunc, RootStore} from "vwebapp-framework";
import "./VWAF/Overrides";
import produce from "immer";
import {Feedback_store} from "firebase-feedback";
import {WithStore} from "mobx-firelink";
import {runInAction} from "mobx";

const context = (require as any).context("../../../Resources/SVGs/", true, /\.svg$/);
const iconInfo = {};
context.keys().forEach(filename=>{
	iconInfo[filename] = context(filename).default;
});

declare module "vwebapp-framework/Source/UserTypes" {
	interface RootStore extends RootState {}
	// interface DBShape extends FirebaseDBShape {}
	interface LogTypes extends LogTypes_New {}
}

export function InitVWAF() {
	manager_framework.Populate({
		iconInfo,

		db_short: DB_SHORT,
		devEnv: DEV,
		prodEnv: PROD,
		dbVersion,
		HasHotReloaded: ()=>hasHotReloaded,
		logTypes,
		mobxCompatMode: true,

		startURL,
		GetLoadActionFuncForURL,
		GetNewURL,
		DoesURLChangeCountAsPageChange,

		GetStore: ()=>store,
		// WithStore,
		// firebaseConfig,

		globalConnectorPropGetters: {
			// also access some other paths here, so that when they change, they trigger ui updates for everything
			_user: ()=>Me(),
			_permissions: ()=>GetUserPermissionGroups(MeID()),
			// _extraInfo: function() { return this.extraInfo; }, // special debug info from within FirebaseConnect function
		},

		PostHandleError: (error, errorStr)=>{
			// wait a bit, in case we're in a reducer function (calling dispatch from within a reducer errors)
			setTimeout(()=>{
				runInAction("VWAF.PostHandleError", ()=>{
					try {
						store.main.notificationMessages.push(new NotificationMessage(errorStr));
					} catch (ex) {
						g.alertCount_notifications = (g.alertCount_notifications | 0) + 1;
						if (g.alertCount_notifications <= 2) {
							alert(errorStr);
						} else {
							console.error(errorStr);
						}
					}
				});
			});
		},

		GetAuth,
		GetUserID: MeID,

		ValidateDBData,

		GetNewURLForStoreChanges,
	});
}

export function GetNewURLForStoreChanges<T = RootState>(actionFunc: ActionFunc<T>, getSubOperatedOnByActionFunc: (root: RootState)=>T = (root=>root as any)) {
	const newState = produce(store, (draft: RootState)=>{
		actionFunc(getSubOperatedOnByActionFunc(draft));
	});
	// have new-state used for our store-accessors (ie. GetNewURL)
	const newURL = WithStore({}, newState, ()=>{
		// and have new-state used for firebase-feedback's store-accessors (ie. GetSelectedProposalID, as called by our GetNewURL)
		// [this part's probably not actually needed, since project-level Link.actionFunc's are unlikely to modify firebase-feedback's internal state; we do this for completeness, though]
		return WithStore({fire: Feedback_store.firelink}, newState.feedback, ()=>{
			return GetNewURL();
		});
	});
	return newURL.toString();
}
import {MeID} from "dm_common";
import {RootState, store} from "Store/index.js";
import {ActionFunc, AddNotificationMessage, AddWVCSchemas, DefaultSkin, GetMirrorOfMobXTree, manager as manager_framework, RunInAction} from "web-vcore";
import produce from "web-vcore/nm/immer";
import {AddSchema, WithStore} from "web-vcore/nm/mobx-graphlink.js";
import {DoesURLChangeCountAsPageChange, GetLoadActionFuncForURL, GetNewURL, pageTree} from "../../Utils/URL/URLs.js";

/*const context = (require as any).context("../../../Resources/SVGs/", true, /\.svg$/);
const iconInfo = {};
context.keys().forEach(filename=>{
	iconInfo[filename] = context(filename).default;
});*/

declare module "web-vcore_UserTypes" {
	interface RootStore extends RootState {}
	//interface DBShape extends GraphDBShape {}
	//interface LogTypes extends LogTypes_New {}
}

AddWVCSchemas(AddSchema);
export function InitWVC() {
	manager_framework.Populate({
		// styling
		GetSkin: ()=>DefaultSkin.main,
		colors: {},
		zIndexes: {subNavBar: 0},
		iconInfo: {},
		useExpandedNavBar: ()=>true,

		// core
		//db_short: DB_SHORT,
		db_short: DEV ? "dev" : "prod",
		devEnv: DEV,
		prodEnv: PROD,
		dbVersion: 12, // last version used (n/a anymore since not using firestore)
		//HasHotReloaded: ()=>hasHotReloaded,
		HasHotReloaded: ()=>false,
		logTypes: {},
		mobxCompatMode: true,

		// urls
		pageTree,
		startURL,
		GetLoadActionFuncForURL,
		GetNewURL,
		DoesURLChangeCountAsPageChange,

		GetStore: ()=>store,

		globalConnectorPropGetters: {},

		PostHandleError: (error, errorStr)=>{
			// wait a bit, in case we're in a reducer function (calling dispatch from within a reducer errors)
			setTimeout(()=>{
				RunInAction("WVC.PostHandleError", ()=>AddNotificationMessage(errorStr));
			});
		},

		GetAuth: ()=>null, // todo
		GetUserID: MeID,

		ValidateDBData: ()=>{},

		GetNewURLForStoreChanges,
	});
}

export function GetNewURLForStoreChanges<T = RootState>(actionFunc: ActionFunc<T>, getSubOperatedOnByActionFunc: (root: RootState)=>T = (root=>root as any)) {
	const store_mirror = GetMirrorOfMobXTree(store);
	// workaround for first-call-not-populated issue
	if (store_mirror.main == null) return null;

	const newState = produce(store_mirror, (draft: RootState)=>{
		actionFunc(getSubOperatedOnByActionFunc(draft));
	});

	// have new-state used for our store-accessors (ie. GetNewURL)
	const newURL = WithStore({}, newState, ()=>{
		return GetNewURL();
	});

	return newURL.toString();
}
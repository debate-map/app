import {GetUserPermissionGroups, Me, MeID} from "dm_common";
import {dbVersion, hasHotReloaded} from "Main.js";
import {RootState, store} from "Store/index.js";
import {AddNotificationMessage} from "Store/main/@NotificationMessage.js";
import {logTypes, LogTypes_New} from "Utils/General/Logging.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {DoesURLChangeCountAsPageChange, GetLoadActionFuncForURL, GetNewURL, pageTree} from "Utils/URL/URLs.js";
import {ActionFunc, AddWVCSchemas, GetMirrorOfMobXTree, manager as manager_framework, RunInAction} from "web-vcore";
import produce from "web-vcore/nm/immer";
import {runInAction} from "web-vcore/nm/mobx.js";
import {AddSchema, WithStore} from "web-vcore/nm/mobx-graphlink.js";
import "./WVC/Overrides.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";

const context = (require as any).context("../../../Resources/SVGs/", true, /\.svg$/);
const iconInfo = {};
context.keys().forEach(filename=>{
	iconInfo[filename] = context(filename).default;
});

//declare module "web-vcore/Source/UserTypes" {
//declare module "web-vcore/Source/UserTypes" {
declare module "web-vcore_UserTypes" {
//declare module "../../../../../node_modules/web-vcore/Source/UserTypes" {
//declare module "../../../../../node_modules/web-vcore/Dist/UserTypes.js" {
//declare module "../../../../../node_modules/web-vcore/Dist/UserTypes.d.ts" {
	interface RootStore extends RootState {}
	// interface DBShape extends GraphDBShape {}
	interface LogTypes extends LogTypes_New {}
}

AddWVCSchemas(AddSchema);
export function InitWVC() {
	manager_framework.Populate({
		// styling
		colors: {},
		zIndexes,
		iconInfo,
		useExpandedNavBar: ()=>true,

		// core
		db_short: DB_SHORT,
		devEnv: DEV,
		prodEnv: PROD,
		dbVersion,
		HasHotReloaded: ()=>hasHotReloaded,
		logTypes,
		mobxCompatMode: true,

		// urls
		pageTree,
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

	// for detecting mutation
	/*const store_oldJSON = JSON.stringify(store);
	const store_mirror_oldJSON = JSON.stringify(store_mirror);
	function CheckMutate() {
		Assert(JSON.stringify(store) == store_oldJSON, "GetNewURLForStoreChanges changed the store!");
		Assert(JSON.stringify(store_mirror) == store_mirror_oldJSON, "GetNewURLForStoreChanges changed the store_mirror!");
		Assert(JSON.stringify(store) == JSON.stringify(store_mirror), ()=>console.log("Store and store_mirror give different JSONs!", JSON.stringify(store), JSON.stringify(store_mirror)));
	}*/

	//const newState = produce(store, (draft: RootState)=>{
	const newState = produce(store_mirror, (draft: RootState)=>{
		actionFunc(getSubOperatedOnByActionFunc(draft));
	});
	//CheckMutate();

	// have new-state used for our store-accessors (ie. GetNewURL)
	const newURL = WithStore({}, newState, ()=>{
		// and have new-state used for firebase-feedback's store-accessors (ie. GetSelectedProposalID, as called by our GetNewURL)
		// [this part's probably not actually needed, since project-level Link.actionFunc's are unlikely to modify firebase-feedback's internal state; we do this for completeness, though]
		//return WithStore({fire: Feedback_store.firelink as any}, newState.feedback, ()=>{
		return GetNewURL();
		//});
	});
	//CheckMutate();

	return newURL.toString();
}
import {VURL, Assert} from "js-vextensions";
import {RootStore} from "web-vcore_UserTypes";
import {PartialBy} from "mobx-graphlink";
import chroma from "chroma-js";
import {browserHistory} from "./Utils/URL/History.js";
import {LogOptions} from "./Utils/General/Logging.js";
import {ActionFunc} from "./Utils/Store/MobX.js";
import {Page} from "./Utils/URL/URLs.js";
import {NotificationMessage} from "./UI/NotificationsUI/NotificationMessage.js";
import {Skin} from "./Utils/Skins/Skin.js";
import {ShouldErrorBeIgnored} from "./Utils/General/Errors.js";

/** For any field in baseMap that extendMap lacks, mutate extendMap to include it; equivalent to Object.assign(extendMap, baseMap, {...extendMap}). */
function ExtendObjectMap_StoredInExtendMap(baseMap: Object, extendMap: Object|n) {
	if (extendMap == null) return baseMap;
	for (const [key, value] of Object.entries(baseMap)) {
		if (!(key in extendMap)) {
			extendMap[key] = value;
		}
	}
}

type Populate_OmitFields = "Populate" | "store" | "rootState";
type Populate_OptionalFields = "colors" | "zIndexes";
export class Manager {
	/*onPopulated = new Promise((resolve, reject)=>this.onPopulated_resolve = resolve);
	onPopulated_resolve: Function;*/
	//Populate(data: Omit<Manager, "onPopulated" | "onPopulated_resolve" | "Populate">) {
	Populate(data: PartialBy<Omit<Manager, Populate_OmitFields>, Populate_OptionalFields>) {
		const oldData = {...this};
		this.Extend(data);

		// use these helpers, such that the object-reference remains the same as the object sent in (thus the caller can mutate the values easily later)
		ExtendObjectMap_StoredInExtendMap(oldData.colors, data.colors);
		ExtendObjectMap_StoredInExtendMap(oldData.zIndexes, data.zIndexes);

		//G({Log: Log}); // set globals
		//this.onPopulated_resolve();
		OnPopulated_listeners.forEach(a=>a());
	}
	// shortcuts
	get store() { return this.GetStore(); }
	//get firestoreDB() { return this.store.firebase.firestore(); }

	// styling and such
	// ==========

	GetSkin: ()=>Skin;
	colors = {};
	zIndexes = {subNavBar: 11};
	iconInfo: {[key: string]: any};
	useExpandedNavBar: ()=>boolean;

	// core flags and such
	// ==========

	db_short: string;
	devEnv: boolean;
	prodEnv: boolean;
	dbVersion: number;
	HasHotReloaded: ()=>boolean;
	logTypes: any;
	/** Changes path-watch-manager to be compatible with mobx. (removes optimizations!) */
	mobxCompatMode: boolean;
	ShouldErrorBeIgnored = ShouldErrorBeIgnored;
	PostHandleError: (error: Error, errorStr: string)=>any;

	// urls
	// ==========

	startURL: VURL;
	pageTree: Page;
	GetLoadActionFuncForURL: (url: VURL)=>ActionFunc<any>;
	GetNewURL: ()=>VURL;
	DoesURLChangeCountAsPageChange: (oldURL: VURL, newURL: VURL)=>boolean;
	// new
	GetNewURLForStoreChanges: (actionFunc: ActionFunc<RootStore>)=>string|n;

	// store+db
	// ==========

	//GetStore: ()=>RootStore;
	GetStore: ()=>any; // due to RootStore's interface-extend approach, we can't add fields from framework code; so might as well leave as "any"
	GetAuth: ()=>any;
	GetUserID: ()=>string|n;
	// If provided, Command.ts will apply each Command's db-updates to a local copy of the db-data, then send this modified data to the ValidateDBData function (for assertions). Should probably disable in production.
	ValidateDBData?: (newData: Object)=>void;

	// others
	// ==========

	globalConnectorPropGetters: {[key: string]: (state: any, props: any)=>any};

	// YoutubePlayer
	GetYoutubePlayerPoolContainer?: ()=>HTMLElement;
	GetYoutubePlayersToKeepBuffered?: ()=>number;
}
export const manager = new Manager();

export const OnPopulated_listeners = [] as (()=>any)[];
export function OnPopulated(listener: ()=>any) { OnPopulated_listeners.push(listener); }

// globals
/*declare global {
	//function Log(message, appendStackTrace?: boolean, logLater?: boolean);
	function Log(options: LogOptions, ...messageSegments: any[]);
	function Log(...messageSegments: any[]);
}*/
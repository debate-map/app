import {ObservableMap} from "mobx";
import {Collection_Closed, Collection, StoreAccessor} from "mobx-firelink";
import {GeneralData} from "./firebase/general";
import {Image} from "./firebase/images/@Image";
import {Layer} from "./firebase/layers/@Layer";
import {NodeEditTimes} from "./firebase/mapNodeEditTimes";
import {Map} from "./firebase/maps/@Map";
import {MapNodePhrasing} from "./firebase/nodePhrasings/@MapNodePhrasing";
import {RatingsRoot} from "./firebase/nodeRatings/@RatingsRoot";
import {MapNode} from "./firebase/nodes/@MapNode";
import {MapNodeRevision} from "./firebase/nodes/@MapNodeRevision";
import {TermComponent} from "./firebase/termComponents/@TermComponent";
import {Term} from "./firebase/terms/@Term";
import {Timeline} from "./firebase/timelines/@Timeline";
import {TimelineStep} from "./firebase/timelineSteps/@TimelineStep";
import {UserExtraInfo} from "./firebase/userExtras/@UserExtraInfo";
import {UserMapInfoSet} from "./firebase/userMapInfo/@UserMapInfo";
import {User} from "./firebase/users/@User";


/* export class Firebase_ModulesState {
	// @O feedback: Firebase_FeedbackState;
}
export class FirebaseState {
	@O modules: Firebase_ModulesState;

	@O general: {data: GeneralData};
	@O images: ObservableMap<string, Image>;
	@O layers: ObservableMap<string, Layer>;
	/* @O maps: {
		[key: number]: Map
			& {nodeEditTimes: DataWrapper<NodeEditTimes>}; // nodeEditTimes -> $nodeID -> $nodeEditTime
	}; *#/
	@O maps: ObservableMap<string, Map>;
	@O mapNodeEditTimes: ObservableMap<string, NodeEditTimes>;
	@O nodes: ObservableMap<string, MapNode>;
	// @O nodeExtras: ObservableMap<string, any>;
	@O nodeRatings: ObservableMap<string, RatingsRoot>; // $nodeID (key) -> $ratingType -> $userID -> value -> $value
	@O nodeRevisions: ObservableMap<string, MapNodeRevision>;
	// @O nodeStats: ObservableMap<string, MapNodeStats>;
	// @O nodeViewers: ObservableMap<string, ViewerSet>; // removed due to privacy concerns
	@O nodePhrasings: ObservableMap<string, MapNodePhrasing>;
	@O terms: ObservableMap<string, Term>;
	@O termComponents: ObservableMap<string, TermComponent>;
	@O termNames: ObservableMap<string, any>;
	@O timelines: ObservableMap<string, Timeline>;
	@O timelineSteps: ObservableMap<string, TimelineStep>;
	@O users: ObservableMap<string, User>;
	@O userExtras: ObservableMap<string, UserExtraInfo>;
	@O userMapInfo: ObservableMap<string, UserMapInfoSet>; // $userID (key) -> $mapID -> layerStates -> $layerID -> [boolean, for whether enabled]
	// @O userViewedNodes: ObservableMap<string, ViewedNodeSet>; // removed due to privacy concerns
} */

export interface FirebaseDBShape {
	modules: Collection_Closed<{
		// feedback: FeedbackDBShape;
	}>;

	general: Collection_Closed<{data: GeneralData}>;
	images: Collection<Image>;
	layers: Collection<Layer>;
	maps: Collection<Map>;
	mapNodeEditTimes: Collection<NodeEditTimes>;
	nodes: Collection<MapNode>;
	// nodeExtras: Collection<any>;
	nodeRatings: Collection<RatingsRoot>; // $nodeID (key) -> $ratingType -> $userID -> value -> $value
	nodeRevisions: Collection<MapNodeRevision>;
	// nodeStats: Collection<MapNodeStats>;
	// nodeViewers: Collection<ViewerSet>; // removed due to privacy concerns
	nodePhrasings: Collection<MapNodePhrasing>;
	terms: Collection<Term>;
	termComponents: Collection<TermComponent>;
	termNames: Collection<any>;
	timelines: Collection<Timeline>;
	timelineSteps: Collection<TimelineStep>;
	users: Collection<User>;
	userExtras: Collection<UserExtraInfo>;
	userMapInfo: Collection<UserMapInfoSet>; // $userID (key) -> $mapID -> layerStates -> $layerID -> [boolean, for whether enabled]
	// userViewedNodes: Collection<ViewedNodeSet>; // removed due to privacy concerns
}

/* export interface FirebaseDBShape {
	modules: Collection_Closed<{
		// feedback: FeedbackDBShape;
	}>;

	general: Collection_Closed<{data: GeneralData}>;
	images: Collection<Image>;
	layers: Collection<Layer>;
	maps: Collection<Map, {
		nodeEditTimes: Collection<NodeEditTimes>,
	}>;
	nodes: Collection<MapNode, {
		ratings: Collection<RatingsRoot>, // $ratingType -> $userID -> value -> $value
		// extras: Collection<any>,
		revisions: Collection<MapNodeRevision>,
		// stats: Collection<MapNodeStats>,
		// viewers: Collection<ViewerSet>, // removed due to privacy concerns
		phrasings: Collection<MapNodePhrasing>,
	}>;
	terms: Collection<Term, {
		components: Collection<TermComponent>,
		names: Collection<any>,
	}>;
	timelines: Collection<Timeline, {
		steps: Collection<TimelineStep>,
	}>;
	users: Collection<User, {
		extras: Collection<UserExtraInfo>,
		mapInfo: Collection<UserMapInfoSet>, // $mapID -> layerStates -> $layerID -> [boolean, for whether enabled]
		// viewedNodes: Collection<ViewedNodeSet>, // removed due to privacy concerns
	}>;
} */

export const GetAuth = StoreAccessor(s=>()=>{
	return s.firelink.userInfo;
});
export const GetAuth_Raw = StoreAccessor(s=>()=>{
	return s.firelink.userInfo_raw;
});
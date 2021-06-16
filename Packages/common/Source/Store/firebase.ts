import {ObservableMap} from "web-vcore/nm/mobx";
import {Collection_Closed, Collection, StoreAccessor, FireUserInfo} from "../../Commands/node_modules/mobx-firelink";
import {GeneralData} from "./firebase/general";
import {Media} from "./firebase/media/@Media";
import {Layer} from "./firebase/layers/@Layer";
import {NodeEditTimes} from "./firebase/mapNodeEditTimes";
import {Map} from "./firebase/maps/@Map";
import {MapNodePhrasing} from "./firebase/nodePhrasings/@MapNodePhrasing";
import {MapNode} from "./firebase/nodes/@MapNode";
import {MapNodeRevision} from "./firebase/nodes/@MapNodeRevision";
import {Term} from "./firebase/terms/@Term";
import {Timeline} from "./firebase/timelines/@Timeline";
import {TimelineStep} from "./firebase/timelineSteps/@TimelineStep";
import {UserMapInfoSet} from "./firebase/userMapInfo/@UserMapInfo";
import {User} from "./firebase/users/@User";
import {User_Private} from "./firebase/users_private/@User_Private";
import {MapNodeTag} from "./firebase/nodeTags/@MapNodeTag";
import {fire} from "../MobXGraphlink";
import {Rating} from "./firebase/nodeRatings/@Rating";
import {Share} from "./firebase/shares/@Share";

// manually import these, since otherwise they're never runtime-imported
require("./firebase/users_private/@User_Private");

export interface FirebaseDBShape {
	general: Collection_Closed<{data: GeneralData}>;
	modules: Collection_Closed<{
		// feedback: FeedbackDBShape;
	}>;

	medias: Collection<Media>;
	layers: Collection<Layer>;
	maps: Collection<Map>;
	mapNodeEditTimes: Collection<NodeEditTimes>;
	nodes: Collection<MapNode>;
	// nodeExtras: Collection<any>;
	nodeRatings: Collection<Rating>;
	nodeRevisions: Collection<MapNodeRevision>;
	// nodeStats: Collection<MapNodeStats>;
	// nodeViewers: Collection<ViewerSet>; // removed due to privacy concerns
	nodePhrasings: Collection<MapNodePhrasing>;
	nodeTags: Collection<MapNodeTag>;
	shares: Collection<Share>;
	terms: Collection<Term>;
	//termNames: Collection<any>;
	timelines: Collection<Timeline>;
	timelineSteps: Collection<TimelineStep>;
	users: Collection<User>;
	users_private: Collection<User_Private>;
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
	//return s.firelink.userInfo;
	return fire.userInfo;
}) as ()=>FireUserInfo;
export const GetAuth_Raw = StoreAccessor(s=>()=>{
	//return s.firelink.userInfo_raw;
	return fire.userInfo_raw as any;
});
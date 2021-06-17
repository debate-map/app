import {Collection_Closed, Collection} from "web-vcore/nm/mobx-graphlink";
import {GeneralData} from "./db/general";
import {Media} from "./db/media/@Media";
import {Layer} from "./db/layers/@Layer";
import {NodeEditTimes} from "./db/mapNodeEditTimes";
import {Map} from "./db/maps/@Map";
import {MapNodePhrasing} from "./db/nodePhrasings/@MapNodePhrasing";
import {MapNode} from "./db/nodes/@MapNode";
import {MapNodeRevision} from "./db/nodes/@MapNodeRevision";
import {Term} from "./db/terms/@Term";
import {Timeline} from "./db/timelines/@Timeline";
import {TimelineStep} from "./db/timelineSteps/@TimelineStep";
import {UserMapInfoSet} from "./db/userMapInfo/@UserMapInfo";
import {User} from "./db/users/@User";
import {User_Private} from "./db/users_private/@User_Private";
import {MapNodeTag} from "./db/nodeTags/@MapNodeTag";
import {Rating} from "./db/nodeRatings/@Rating";
import {Share} from "./db/shares/@Share";

// manually import these, since otherwise they're never runtime-imported
require("./firebase/users_private/@User_Private");

declare module "mobx-graphlink/Dist/UserTypes" {
	interface DBShape extends GraphDBShape {}
}

export interface GraphDBShape {
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

/*export const GetAuth = StoreAccessor(s=>()=>{
	//return s.firelink.userInfo;
	return fire.userInfo;
}) as ()=>FireUserInfo;
export const GetAuth_Raw = StoreAccessor(s=>()=>{
	//return s.firelink.userInfo_raw;
	return fire.userInfo_raw as any;
});*/
import {Collection} from "web-vcore/nm/mobx-graphlink.js";
import {AccessPolicy} from "./DB/accessPolicies/@AccessPolicy.js";
import {Map_NodeEdit} from "./DB/mapNodeEdits/@MapNodeEdit.js";
import {Map} from "./DB/maps/@Map.js";
import {Media} from "./DB/media/@Media.js";
import {NodeChildLink} from "./DB/nodeChildLinks/@NodeChildLink.js";
import {NodeRating} from "./DB/nodeRatings/@NodeRating.js";
import {MapNode} from "./DB/nodes/@MapNode.js";
import {MapNodeRevision} from "./DB/nodes/@MapNodeRevision.js";
import {MapNodeTag} from "./DB/nodeTags/@MapNodeTag.js";
import {Share} from "./DB/shares/@Share.js";
import {Term} from "./DB/terms/@Term.js";
import {User} from "./DB/users/@User.js"; // eslint-disable-line
import {UserHidden} from "./DB/userHiddens/@UserHidden.js"; // eslint-disable-line
import {VisibilityDirective} from "./DB/visibilityDirectives/@VisibilityDirective.js";

declare module "mobx-graphlink/Dist/UserTypes" {
	interface DBShape extends GraphDBShape {}
}

// helper, to avoid need to ensure each type is runtime-imported as well (needed for their schemas to be registered)
function DefineCollection<T>(typeConstructor: new(..._)=>T): Collection<T> {
	return undefined as any;
}

export class GraphDBShape {
	//general: Collection_Closed<{data: GeneralData}>;
	/*modules: Collection_Closed<{
		// feedback: FeedbackDBShape;
	}>;*/

	//accessPolicies: Collection<AccessPolicy>;
	accessPolicies = DefineCollection(AccessPolicy);
	visibilityDirectives = DefineCollection(VisibilityDirective);
	medias = DefineCollection(Media);
	maps = DefineCollection(Map);
	mapNodeEdits = DefineCollection(Map_NodeEdit);
	nodes = DefineCollection(MapNode);
	//nodeExtras = DefineCollection(any);
	nodeRatings = DefineCollection(NodeRating);
	nodeRevisions = DefineCollection(MapNodeRevision);
	//nodeStats = DefineCollection(MapNodeStats);
	//nodeViewers = DefineCollection(ViewerSet); // removed due to privacy concerns
	//nodePhrasings = DefineCollection(MapNodePhrasing);
	nodeChildLinks = DefineCollection(NodeChildLink);
	nodeTags = DefineCollection(MapNodeTag);
	shares = DefineCollection(Share);
	terms = DefineCollection(Term);
	//termNames = DefineCollection(any);
	/*timelines = DefineCollection(Timeline);
	timelineSteps = DefineCollection(TimelineStep);*/
	users = DefineCollection(User);
	userHiddens = DefineCollection(UserHidden);
	//userMapInfo = DefineCollection(UserMapInfoSet); // $userID (key) -> $mapID -> layerStates -> $layerID -> [boolean, for whether enabled]
	//userViewedNodes = DefineCollection(ViewedNodeSet); // removed due to privacy concerns
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

/*export const GetAuth = CreateAccessor(c=>()=>{
	//return s.firelink.userInfo;
	return fire.userInfo;
}) as ()=>FireUserInfo;
export const GetAuth_Raw = CreateAccessor(c=>()=>{
	//return s.firelink.userInfo_raw;
	return fire.userInfo_raw as any;
});*/
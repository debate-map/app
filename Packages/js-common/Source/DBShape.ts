import {Collection} from "mobx-graphlink";
import {CommandRun} from "./DB/commandRuns/@CommandRun.js";
import {AccessPolicy} from "./DB/accessPolicies/@AccessPolicy.js";
import {MapNodeEdit} from "./DB/mapNodeEdits/@MapNodeEdit.js";
import {DMap} from "./DB/maps/@Map.js";
import {Media} from "./DB/media/@Media.js";
import {NodeLink} from "./DB/nodeLinks/@NodeLink.js";
import {NodeRating} from "./DB/nodeRatings/@NodeRating.js";
import {NodeL1} from "./DB/nodes/@Node.js";
import {NodeRevision} from "./DB/nodes/@NodeRevision.js";
import {NodeTag} from "./DB/nodeTags/@NodeTag.js";
import {Share} from "./DB/shares/@Share.js";
import {Term} from "./DB/terms/@Term.js";
import {User} from "./DB/users/@User.js";
import {UserHidden} from "./DB/userHiddens/@UserHidden.js";
import {NodePhrasing} from "./DB/nodePhrasings/@NodePhrasing.js";
import {GlobalData} from "./DB/globalData/@GlobalData.js";
import {Timeline, TimelineStep} from "./DB.js";
import {Notification} from "./DB/notifications/@Notification.js";
import {Subscription} from "./DB/subscriptions/@Subscription.js";

declare module "mobx-graphlink/Dist/UserTypes" {
	interface UT_DBShape extends GraphDBShape {}
}

// helper, to avoid need to ensure each type is runtime-imported as well (needed for their schemas to be registered)
function DefineCollection<T>(typeConstructor: new(..._)=>T): Collection<T> {
	return undefined as any;
}

export class GraphDBShape {
	//general: Collection_Closed<{data: GeneralData}>;
	globalData = DefineCollection(GlobalData);

	// from modules
	/*modules: Collection_Closed<{
		// feedback: FeedbackDBShape;
	}>;*/
	/*feedback_proposals = DefineCollection(Proposal);
	feedback_userInfos = DefineCollection(Feedback_UserInfo);*/

	//accessPolicies: Collection<AccessPolicy>;
	accessPolicies = DefineCollection(AccessPolicy);
	commandRuns = DefineCollection(CommandRun);
	medias = DefineCollection(Media);
	maps = DefineCollection(DMap);
	mapNodeEdits = DefineCollection(MapNodeEdit);
	nodes = DefineCollection(NodeL1);
	//nodeExtras = DefineCollection(any);
	nodeRatings = DefineCollection(NodeRating);
	nodeRevisions = DefineCollection(NodeRevision);
	//nodeStats = DefineCollection(NodeL1Stats);
	nodePhrasings = DefineCollection(NodePhrasing);
	nodeLinks = DefineCollection(NodeLink);
	nodeTags = DefineCollection(NodeTag);
	notifications = DefineCollection(Notification);
	shares = DefineCollection(Share);
	subscriptions = DefineCollection(Subscription);
	terms = DefineCollection(Term);
	//termNames = DefineCollection(any);
	timelines = DefineCollection(Timeline);
	timelineSteps = DefineCollection(TimelineStep);
	users = DefineCollection(User);
	userHiddens = DefineCollection(UserHidden);

	//userMapInfo = DefineCollection(UserMapInfoSet); // $userID (key) -> $mapID -> layerStates -> $layerID -> [boolean, for whether enabled]
	//visibilityDirectives = DefineCollection(VisibilityDirective);
}
export type DBCollection = keyof GraphDBShape;

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
	nodes: Collection<NodeL1, {
		ratings: Collection<RatingsRoot>, // $ratingType -> $userID -> value -> $value
		// extras: Collection<any>,
		revisions: Collection<NodeRevision>,
		// stats: Collection<NodeL1Stats>,
		// viewers: Collection<ViewerSet>, // removed due to privacy concerns
		phrasings: Collection<NodePhrasing>,
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

/*export const GetAuth = CreateAccessor(()=>{
	//return s.firelink.userInfo;
	return fire.userInfo;
}) as ()=>FireUserInfo;
export const GetAuth_Raw = CreateAccessor(()=>{
	//return s.firelink.userInfo_raw;
	return fire.userInfo_raw as any;
});*/
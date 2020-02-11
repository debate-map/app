import { StoreAccessor } from "mobx-firelink";
import { fire } from "../MobXFirelink";
// manually import these, since otherwise they're never runtime-imported
require("./firebase/users_private/@User_Private");
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
export const GetAuth = StoreAccessor(s => () => {
    //return s.firelink.userInfo;
    return fire.userInfo;
});
export const GetAuth_Raw = StoreAccessor(s => () => {
    //return s.firelink.userInfo_raw;
    return fire.userInfo_raw;
});

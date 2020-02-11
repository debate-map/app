import { Collection_Closed, Collection } from "mobx-firelink";
import { GeneralData } from "./firebase/general";
import { Image } from "./firebase/images/@Image";
import { Layer } from "./firebase/layers/@Layer";
import { NodeEditTimes } from "./firebase/mapNodeEditTimes";
import { Map } from "./firebase/maps/@Map";
import { MapNodePhrasing } from "./firebase/nodePhrasings/@MapNodePhrasing";
import { RatingsRoot_ForDBTree } from "./firebase/nodeRatings/@RatingsRoot";
import { MapNode } from "./firebase/nodes/@MapNode";
import { MapNodeRevision } from "./firebase/nodes/@MapNodeRevision";
import { Term } from "./firebase/terms/@Term";
import { Timeline } from "./firebase/timelines/@Timeline";
import { TimelineStep } from "./firebase/timelineSteps/@TimelineStep";
import { UserMapInfoSet } from "./firebase/userMapInfo/@UserMapInfo";
import { User } from "./firebase/users/@User";
import { User_Private } from "./firebase/users_private/@User_Private";
import { MapNodeTag } from "./firebase/nodeTags/@MapNodeTag";
export interface FirebaseDBShape {
    general: Collection_Closed<{
        data: GeneralData;
    }>;
    modules: Collection_Closed<{}>;
    images: Collection<Image>;
    layers: Collection<Layer>;
    maps: Collection<Map>;
    mapNodeEditTimes: Collection<NodeEditTimes>;
    nodes: Collection<MapNode>;
    nodeRatings: Collection<RatingsRoot_ForDBTree>;
    nodeRevisions: Collection<MapNodeRevision>;
    nodePhrasings: Collection<MapNodePhrasing>;
    nodeTags: Collection<MapNodeTag>;
    terms: Collection<Term>;
    termNames: Collection<any>;
    timelines: Collection<Timeline>;
    timelineSteps: Collection<TimelineStep>;
    users: Collection<User>;
    users_private: Collection<User_Private>;
    userMapInfo: Collection<UserMapInfoSet>;
}
export declare const GetAuth: (() => import("mobx-firelink").FireUserInfo) & {
    Wait: () => import("mobx-firelink").FireUserInfo;
};
export declare const GetAuth_Raw: (() => import("firebase").User) & {
    Wait: () => import("firebase").User;
};

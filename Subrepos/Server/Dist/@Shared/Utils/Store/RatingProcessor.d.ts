import { Rating, RatingsSet } from "../../Store/firebase/nodeRatings/@RatingsRoot";
import { MapNodeL2 } from "../../Store/firebase/nodes/@MapNode";
export declare const GetArgumentImpactPseudoRating: ((argument: MapNodeL2, premises: MapNodeL2[], userID: string) => Rating) & {
    Wait: (argument: MapNodeL2, premises: MapNodeL2[], userID: string) => Rating;
};
export declare const GetArgumentImpactPseudoRatingSet: ((argument: MapNodeL2, premises: MapNodeL2[]) => RatingsSet) & {
    Wait: (argument: MapNodeL2, premises: MapNodeL2[]) => RatingsSet;
};

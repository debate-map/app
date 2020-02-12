import { Rating } from "../../Store/firebase/nodeRatings/@Rating";
import { MapNodeL2 } from "../../Store/firebase/nodes/@MapNode";
export declare const GetArgumentImpactPseudoRating: ((argument: MapNodeL2, premises: MapNodeL2[], userID: string) => Rating) & {
    Wait: (argument: MapNodeL2, premises: MapNodeL2[], userID: string) => Rating;
};
export declare const GetArgumentImpactPseudoRatings: ((argument: MapNodeL2, premises: MapNodeL2[]) => Rating[]) & {
    Wait: (argument: MapNodeL2, premises: MapNodeL2[]) => Rating[];
};

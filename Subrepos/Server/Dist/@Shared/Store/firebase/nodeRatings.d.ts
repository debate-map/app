import { RatingType } from "./nodeRatings/@RatingType";
import { Rating } from "./nodeRatings/@Rating";
import { HolderType } from "./nodes";
import { MapNodeL3 } from "./nodes/@MapNode";
export declare const GetRatings: ((nodeID: string, ratingType: RatingType, userID?: string) => Rating[]) & {
    Wait: (nodeID: string, ratingType: RatingType, userID?: string) => Rating[];
};
export declare const GetRating: ((nodeID: string, ratingType: RatingType, userID: string) => Rating) & {
    Wait: (nodeID: string, ratingType: RatingType, userID: string) => Rating;
};
export declare const GetRatingValue: ((nodeID: string, ratingType: RatingType, userID: string, resultIfNoData?: any) => number) & {
    Wait: (nodeID: string, ratingType: RatingType, userID: string, resultIfNoData?: any) => number;
};
export declare const GetRatingAverage: ((nodeID: string, ratingType: RatingType, userID?: string) => number) & {
    Wait: (nodeID: string, ratingType: RatingType, userID?: string) => number;
};
export declare const GetRatingAverage_AtPath: ((node: MapNodeL3, ratingType: RatingType, userID?: string, resultIfNoData?: any) => number) & {
    Wait: (node: MapNodeL3, ratingType: RatingType, userID?: string, resultIfNoData?: any) => number;
};
export declare enum WeightingType {
    Votes = 10,
    ReasonScore = 20
}
export declare const GetFillPercent_AtPath: ((node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: RatingType, weighting?: any, userID?: string, resultIfNoData?: any) => number) & {
    Wait: (node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: RatingType, weighting?: any, userID?: string, resultIfNoData?: any) => number;
};
export declare const GetMarkerPercent_AtPath: ((node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: RatingType, weighting?: any) => number) & {
    Wait: (node: MapNodeL3, path: string, boxType?: HolderType, ratingType?: RatingType, weighting?: any) => number;
};
/** Returns an int from 0 to 100. */
/** Returns an int from 0 to 100. */
export declare function TransformRatingForContext(ratingValue: number, reverseRating: boolean): number;
export declare function ShouldRatingTypeBeReversed(node: MapNodeL3, ratingType: RatingType): boolean;

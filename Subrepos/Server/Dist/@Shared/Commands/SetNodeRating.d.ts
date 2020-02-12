import { Command } from "mobx-firelink";
import { RatingType } from "../Store/firebase/nodeRatings/@RatingType";
import { Rating } from "../Store/firebase/nodeRatings/@Rating";
export declare class SetNodeRating extends Command<{
    nodeID: string;
    ratingType: RatingType;
    value: number;
}, {}> {
    oldRating: Rating;
    newID: string;
    newRating: Rating;
    Validate(): void;
    GetDBUpdates(): {};
}

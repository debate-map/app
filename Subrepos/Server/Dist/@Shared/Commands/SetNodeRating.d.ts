import { Command } from "mobx-firelink";
import { RatingType } from "../Store/firebase/nodeRatings/@RatingType";
export declare class SetNodeRating extends Command<{
    nodeID: string;
    ratingType: RatingType;
    value: number;
}, {}> {
    Validate(): void;
    GetDBUpdates(): {};
}

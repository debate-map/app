import {AddSchema, AssertValidate} from "mobx-firelink";
import {Command} from "mobx-firelink";
import {RatingType} from "../Store/firebase/nodeRatings/@RatingType";
import {Rating} from "../Store/firebase/nodeRatings/@RatingsRoot";

export class SetNodeRating extends Command<{nodeID: string, ratingType: RatingType, value: number}, {}> {
	Validate() {
		AssertValidate({
			properties: {
				nodeID: {type: "string"},
				ratingType: {$ref: "RatingType"},
				value: {type: ["number", "null"]},
			},
			required: ["nodeID", "ratingType", "value"],
		}, this.payload, "Payload invalid");
	}

	GetDBUpdates() {
		const {nodeID, ratingType, value} = this.payload;
		const updates = {};
		updates[`nodeRatings/${nodeID}/${ratingType}/${this.userInfo.id}`] = value != null ? new Rating(value) : null;
		return updates;
	}
}
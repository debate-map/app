import {Rating} from "Store/firebase/nodeRatings/@RatingsRoot";
import {RatingType} from "Store/firebase/nodeRatings/@RatingType";
import {AddSchema, AssertValidate} from "vwebapp-framework";
import {Command} from "mobx-firelink";

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
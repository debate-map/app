import {AddSchema, AssertValidate, BU, Command, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {emptyArray_forLoading} from "web-vcore/nm/js-vextensions.js";
import {NodeRatingType} from "../DB/nodeRatings/@NodeRatingType.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {GetRatings} from "../DB/nodeRatings.js";

export class SetNodeRating extends Command<{nodeID: string, ratingType: Exclude<NodeRatingType, "impact">, value: number|n}, {}> {
	oldRating: NodeRating;
	newID: string;
	newRating: NodeRating;
	Validate() {
		AssertValidate({
			properties: {
				nodeID: {type: "string"},
				ratingType: {$ref: "NodeRatingType"},
				value: {type: ["number", "null"]},
			},
			required: ["nodeID", "ratingType", "value"],
		}, this.payload, "Payload invalid");
		const {nodeID, ratingType, value} = this.payload;

		const oldRatings = GetRatings(nodeID, ratingType, this.userInfo.id);
		BU(oldRatings.length <= 1, `There should not be more than one rating for this given "slot"!`);
		this.oldRating = oldRatings[0];

		if (value != null) {
			this.newID = GenerateUUID();
			this.newRating = new NodeRating({
				node: nodeID, type: ratingType, user: this.userInfo.id,
				editedAt: Date.now(),
				value,
			});
		}
	}

	DeclareDBUpdates(db) {
		if (this.oldRating) {
			db.set(`nodeRatings/${this.oldRating.id}`, null);
		}
		if (this.newRating) {
			db.set(`nodeRatings/${this.newID}`, this.newRating);
		}
	}
}
import {AddSchema, AssertValidate, BU, Command, CommandMeta, DBHelper, dbp, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {emptyArray_forLoading} from "web-vcore/nm/js-vextensions.js";
import {NodeRatingType} from "../DB/nodeRatings/@NodeRatingType.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {GetRatings} from "../DB/nodeRatings.js";

@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			nodeID: {type: "string"},
			ratingType: {$ref: "NodeRatingType"},
			value: {type: ["number", "null"]},
		},
		required: ["nodeID", "ratingType", "value"],
	}),
})
export class SetNodeRating extends Command<{nodeID: string, ratingType: Exclude<NodeRatingType, "impact">, value: number|n}, {}> {
	oldRating: NodeRating;
	newRating: NodeRating;
	Validate() {
		const {nodeID, ratingType, value} = this.payload;

		const oldRatings = GetRatings(nodeID, ratingType, this.userInfo.id);
		BU(oldRatings.length <= 1, `There should not be more than one rating for this given "slot"!`);
		this.oldRating = oldRatings[0];

		if (value != null) {
			this.newRating = new NodeRating({
				node: nodeID, type: ratingType, user: this.userInfo.id,
				editedAt: Date.now(),
				value,
			});
			this.newRating.id = this.GenerateUUID_Once("newRating.id");
		}
	}

	DeclareDBUpdates(db: DBHelper) {
		if (this.oldRating) {
			db.set(dbp`nodeRatings/${this.oldRating.id}`, null);
		}
		if (this.newRating) {
			db.set(dbp`nodeRatings/${this.newRating.id}`, this.newRating);
		}
	}
}
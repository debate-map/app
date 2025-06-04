import {AddSchema, AssertValidate, BU, Command, CommandMeta, DBHelper, dbp, GenerateUUID, SimpleSchema} from "mobx-graphlink";
import {Assert, emptyArray_forLoading} from "js-vextensions";
import {NodeRatingType} from "../DB/nodeRatings/@NodeRatingType.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {GetRatings} from "../DB/nodeRatings.js";
import {DeleteNodeRating} from "./DeleteNodeRating.js";
import {UpdateNodeRatingSummaries} from "./UpdateNodeRatingSummaries.js";

@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		$rating: {$ref: NodeRating.name},
	}),
})
export class SetNodeRating extends Command<{rating: NodeRating}, {}> {
	subs_deleteOldRatings: DeleteNodeRating[];
	sub_updateRatingSummaries: UpdateNodeRatingSummaries;
	Validate() {
		const {rating} = this.input;

		Assert(rating.type != "impact", "Cannot set impact rating directly.");
		const oldRatings = GetRatings(rating.node, rating.type, [this.userInfo.id]);
		//Assert(oldRatings.length <= 1, `There should not be more than one rating for this given "slot"!`);
		const subs_deleteOldRatings_new = [] as DeleteNodeRating[];
		for (const [i, oldRating] of oldRatings.entries()) {
			this.IntegrateSubcommand(
				()=>this.subs_deleteOldRatings[i],
				c=>subs_deleteOldRatings_new[i] = c,
				new DeleteNodeRating({id: oldRating.id}),
				a=>a.oldData = oldRating,
			);
		}
		this.subs_deleteOldRatings = subs_deleteOldRatings_new;

		rating.id = this.GenerateUUID_Once("rating.id");
		rating.creator = this.userInfo.id;
		rating.createdAt = Date.now();

		this.IntegrateSubcommand(()=>this.sub_updateRatingSummaries, null, new UpdateNodeRatingSummaries({
			nodeID: rating.node, ratingType: rating.type,
			ratingsBeingRemoved: this.subs_deleteOldRatings.map(a=>a.input.id),
			ratingsBeingAdded: [rating],
		}));
	}

	DeclareDBUpdates(db: DBHelper) {
		const {rating} = this.input;
		for (const sub of this.subs_deleteOldRatings) {
			db.add(sub.GetDBUpdates(db));
		}
		db.set(dbp`nodeRatings/${rating.id}`, rating);
		db.add(this.sub_updateRatingSummaries.GetDBUpdates(db));
	}
}
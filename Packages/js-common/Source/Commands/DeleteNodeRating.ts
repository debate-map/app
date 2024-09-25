import {Command, CommandMeta, DBHelper, dbp, SimpleSchema, AssertV} from "mobx-graphlink";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeRating} from "../DB/nodeRatings.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {UpdateNodeRatingSummaries} from "./UpdateNodeRatingSummaries.js";
import {PERMISSIONS} from "../DB.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteNodeRating extends Command<{id: string}, {}> {
	oldData: NodeRating;
	sub_updateRatingSummaries: UpdateNodeRatingSummaries;
	Validate() {
		const {id} = this.payload;
		//this.oldData = GetNodeRating.NN(id);
		this.oldData = this.oldData ?? GetNodeRating.NN(id); // temp fix for issue that will ultimately be fixed by planned Command-execution rework (wrapper command read+write logic in [regular-code-driven] PG transactions)
		AssertV(PERMISSIONS.NodeRating.Delete(this.userInfo.id, this.oldData));

		this.IntegrateSubcommand(()=>this.sub_updateRatingSummaries, null, new UpdateNodeRatingSummaries({
			nodeID: this.oldData.node, ratingType: this.oldData.type,
			ratingsBeingRemoved: [id], ratingsBeingAdded: [],
		}));
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`nodeRatings/${id}`, null);
		db.add(this.sub_updateRatingSummaries.GetDBUpdates(db));
	}
}
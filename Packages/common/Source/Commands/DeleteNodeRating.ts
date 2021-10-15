import {AV, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {GetNodeRating} from "../DB/nodeRatings.js";
import {UserEdit} from "../CommandMacros.js";
import {MapNodeTag} from "../DB/nodeTags/@MapNodeTag.js";
import {GetNodeTag} from "../DB/nodeTags.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";
import {UpdateNodeRatingSummaries} from "./UpdateNodeRatingSummaries.js";

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
		this.oldData = GetNodeRating.NN(id);
		AssertUserCanDelete(this, this.oldData);
		
		this.sub_updateRatingSummaries = new UpdateNodeRatingSummaries({
			node: this.oldData.node, ratingType: this.oldData.type,
			ratingsBeingRemoved: [id], ratingsBeingAdded: [],
		}).MarkAsSubcommand(this);
		this.sub_updateRatingSummaries.Validate();
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`nodeRatings/${id}`, null);
		db.add(this.sub_updateRatingSummaries.GetDBUpdates(db));
	}
}
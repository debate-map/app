import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {ReverseMapNodeType, IsArgumentNode} from "../../Store/firebase/nodes/$node";
import {ReverseThenType} from "../../Store/firebase/nodes/$node/$metaThesis";
import * as u from "updeep";
import {RatingsSet} from "../../Store/firebase/nodeRatings/@RatingsRoot";

AddSchema({
	properties: {
		nodeID: {type: "number"},
	},
	required: ["nodeID"],
}, "ReverseArgumentPolarity_payload");

export default class ReverseArgumentPolarity extends Command<{nodeID: number}> {
	Validate_Early() {
		AssertValidate("ReverseArgumentPolarity_payload", this.payload, `Payload invalid`);
	}

	oldNodeData: MapNode;
	newNodeData: MapNode;
	metaThesisID: number;
	newMetaThesisData: MapNode;
	async Prepare() {
		let {nodeID} = this.payload;

		this.oldNodeData = await GetDataAsync(`nodes/${nodeID}`, true, false) as MapNode;
		//let newNodeData = u.updateIn("type", ReverseMapNodeType(oldNodeData.type), oldNodeData);
		this.newNodeData = {...this.oldNodeData, type: ReverseMapNodeType(this.oldNodeData.type)};

		this.metaThesisID = this.oldNodeData.childrenOrder[0];
		let oldMetaThesisData = await GetDataAsync(`nodes/${this.metaThesisID}`, true, false) as MapNode;
		this.newMetaThesisData = u.updateIn("metaThesis.thenType", ReverseThenType(oldMetaThesisData.metaThesis.thenType), oldMetaThesisData);

		/*let oldMetaThesisAdjustmentRatingSet = await GetDataAsync(`nodeRatings/${metaThesisID}/adjustment`, true, false) as RatingsSet;
		let newMetaThesisAdjustmentRatingSet = Clone(oldMetaThesisAdjustmentRatingSet) as RatingsSet;
		for (let rating of (newMetaThesisAdjustmentRatingSet || {}).VValues(true)) {
			rating.value = 100 - rating.value;
		}*/
	}
	async Validate() {
		Assert(IsArgumentNode(this.oldNodeData), "Can only reverse polarity of an argument node.");

		AssertValidate("MapNode", this.newNodeData, `New node-data invalid`);
		AssertValidate("MapNode", this.newMetaThesisData, `New meta-thesis-data invalid`);
		//AssertValidate("RatingsSet", newMetaThesisAdjustmentRatingSet, `New meta-thesis adjustment-ratings-set invalid`);
	}

	GetDBUpdates() {
		let {nodeID} = this.payload;

		let updates = {};
		updates[`nodes/${nodeID}`] = this.newNodeData;
		updates[`nodes/${this.metaThesisID}`] = this.newMetaThesisData;
		// reverse meta-thesis ratings
		//dbUpdates[`nodeRatings/${metaThesisID}/adjustment`] = newMetaThesisAdjustmentRatingSet;
		// delete meta-thesis ratings
		updates[`nodeRatings/${this.metaThesisID}`] = null;
		return updates;
	}
}
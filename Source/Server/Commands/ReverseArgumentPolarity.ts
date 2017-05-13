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
	async Run() {
		let {nodeID} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		let oldNodeData = await GetDataAsync(`nodes/${nodeID}`, true, false) as MapNode;
		Assert(IsArgumentNode(oldNodeData), "Can only reverse polarity of an argument node.");		

		// prepare
		// ==========
		
		//let newNodeData = u.updateIn("type", ReverseMapNodeType(oldNodeData.type), oldNodeData);
		let newNodeData = {...oldNodeData, type: ReverseMapNodeType(oldNodeData.type)};
		let metaThesisID = oldNodeData.childrenOrder[0];
		let oldMetaThesisData = await GetDataAsync(`nodes/${metaThesisID}`, true, false) as MapNode;
		let newMetaThesisData = u.updateIn("metaThesis.thenType", ReverseThenType(oldMetaThesisData.metaThesis.thenType), oldMetaThesisData);
		/*let oldMetaThesisAdjustmentRatingSet = await GetDataAsync(`nodeRatings/${metaThesisID}/adjustment`, true, false) as RatingsSet;
		let newMetaThesisAdjustmentRatingSet = Clone(oldMetaThesisAdjustmentRatingSet) as RatingsSet;
		for (let rating of (newMetaThesisAdjustmentRatingSet || {}).VValues(true)) {
			rating.value = 100 - rating.value;
		}*/
		
		// validate state
		// ==========

		AssertValidate("MapNode", newNodeData, `New node-data invalid: ${ajv.FullErrorsText()}`);
		AssertValidate("MapNode", newMetaThesisData, `New meta-thesis-data invalid: ${ajv.FullErrorsText()}`);
		//AssertValidate("RatingsSet", newMetaThesisAdjustmentRatingSet, `New meta-thesis adjustment-ratings-set invalid: ${ajv.FullErrorsText()}`);

		// execute
		// ==========

		let dbUpdates = {};
		dbUpdates[`nodes/${nodeID}`] = newNodeData;
		dbUpdates[`nodes/${metaThesisID}`] = newMetaThesisData;
		// reverse meta-thesis ratings
		//dbUpdates[`nodeRatings/${metaThesisID}/adjustment`] = newMetaThesisAdjustmentRatingSet;
		// delete meta-thesis ratings
		dbUpdates[`nodeRatings/${metaThesisID}`] = null;
		await firebase.Ref().update(dbUpdates);
	}
}
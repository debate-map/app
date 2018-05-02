import DeleteNode from "Server/Commands/DeleteNode";
import {ApplyDBUpdates_Local} from "../../../../Frame/Database/DatabaseHelpers";
import {FirebaseData} from "../../../../Store/firebase";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {AddUpgradeFunc} from "../../Admin";
import {StopStateDataOverride, UpdateStateDataOverride} from "UI/@Shared/StateOverrides";
import {State_overrideData_value} from "../../../@Shared/StateOverrides";

let newVersion = 10;
AddUpgradeFunc(newVersion, async (oldData, markProgress)=> {
	let data = Clone(oldData) as FirebaseData;
	let v8Data = window["v8Data"]; // set using console

	// convert "probability" and "degree" ratings into "truth" ratings
	// ==========

	markProgress(0, 0, 1);
	for (let {index, value: nodeRatingRoot} of data.nodeRatings.Props(true)) {
		await markProgress(1, index, data.nodeRatings.Props(true).length);
		if (nodeRatingRoot.probability) {
			nodeRatingRoot.truth = nodeRatingRoot.probability;
			delete nodeRatingRoot.probability;
		}
		if (nodeRatingRoot.degree) {
			nodeRatingRoot.truth = nodeRatingRoot.degree;
			delete nodeRatingRoot.degree;
		}
	}

	// convert "probability" and "degree" ratings into "truth" ratings
	// ==========

	markProgress(0, 0, 1);
	for (let {index, name: nodeIDStr, value: nodeRatingRoot} of v8Data.nodeRatings.Props(true)) {
		await markProgress(1, index, v8Data.nodeRatings.Props(true).length);
		if (nodeRatingRoot.impact) {
			let argumentNodeID = parseInt(nodeIDStr) - 1; // argument-node's id is always one lower than impact-premise's
			data.nodeRatings[argumentNodeID] = data.nodeRatings[argumentNodeID] || {};
			data.nodeRatings[argumentNodeID].relevance = nodeRatingRoot.impact;
			delete data.nodeRatings[nodeIDStr];
		}
	}

	return data;
});
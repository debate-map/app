import {DeleteNode} from "Server/Commands/DeleteNode";
import {ApplyDBUpdates_Local} from "../../../../Frame/Database/DatabaseHelpers";
import {FirebaseData} from "../../../../Store/firebase";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {AddUpgradeFunc} from "../../Admin";
import {StopStateDataOverride, UpdateStateDataOverride} from "UI/@Shared/StateOverrides";
import {State_overrideData_value} from "../../../@Shared/StateOverrides";

let newVersion = 9;
AddUpgradeFunc(newVersion, async (oldData, markProgress)=> {
	let data = Clone(oldData) as FirebaseData;

	// [clean up some invalid data in prod db]
	// ==========

	markProgress(0, -1, 3);
	for (let {index, value: node} of data.nodes.Props(true)) {
		await markProgress(1, index, oldData.nodes.Props(true).length);
		let revision = data.nodeRevisions[node.currentRevision];

		if (node.type != MapNodeType.Category && node.parents == null && node.children == null) {
			// delete node
			let deleteNode = new DeleteNode({nodeID: node._id});
			await deleteNode.PreRun();
			data = ApplyDBUpdates_Local(data, deleteNode.GetDBUpdates());
		}
	}

	// remove impact-premise nodes
	// ==========

	markProgress(0, 0, 3);
	for (let {index, value: node} of data.nodes.Props(true)) {
		await markProgress(1, index, oldData.nodes.Props(true).length);
		let revision = data.nodeRevisions[node.currentRevision];
		if (revision["impactPremise"]) {
			// move impact-premise children to children of argument (as relevance arguments now)
			let parentArg = data.nodes[node.parents.VKeys(true)[0]];
			for (let childID of (node.children || {}).VKeys(true)) {
				let child = data.nodes[childID];
				parentArg.children[childID] = node.children[childID];
				delete node.children[childID];
				child.parents[parentArg._id] = {_: true};
				delete child.parents[node._id];
			}

			// set argument-type to impact-premise's if-type
			let parentArgRevision = data.nodeRevisions[parentArg.currentRevision];
			parentArgRevision.argumentType = revision["impactPremise"].ifType;

			UpdateStateDataOverride({[`nodes/${node._id}/children`]: null});

			// delete impact-premise node
			let deleteNode = new DeleteNode({nodeID: node._id});
			await deleteNode.PreRun();
			data = ApplyDBUpdates_Local(data, deleteNode.GetDBUpdates());
		}
	}

	// add empty revision.titles if missing
	// ==========

	markProgress(0, 1);
	for (let {index, value: revision} of data.nodeRevisions.Props(true)) {
		await markProgress(1, index, oldData.nodeRevisions.Props(true).length);
		if (revision.titles == null) {
			revision.titles = {base: ""};
		}
	}

	// find arguments with more than one premise, and mark them as multi-premise arguments
	// ==========

	markProgress(0, 2);
	for (let {index, value: node} of data.nodes.Props(true)) {
		await markProgress(1, index, oldData.nodes.Props(true).length);
		if (node.type == MapNodeType.Argument) {
			let children = (node.children || {}).VKeys(true).map(id=>data.nodes[id]);
			let childClaims = children.filter(a=>a.type == MapNodeType.Claim);
			if (childClaims.length > 1) {
				node.multiPremiseArgument = true;
			}
		}
	}

	return data;
});
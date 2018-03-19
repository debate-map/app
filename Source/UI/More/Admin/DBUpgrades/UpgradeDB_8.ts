import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc} from "../../Admin";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {FirebaseData} from "../../../../Store/firebase";
import {MapNodeRevision} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import {MapNode, ChildEntry, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {GetTreeNodesInObjTree} from "js-vextensions";

/*let newVersion = 8;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = Clone(oldData) as FirebaseData;

	// merge SupportingArgument and OpposingArgument
	// ==========

	for (let node of data.nodes.VValues(true)) {
		let revision = data.nodeRevisions[node.currentRevision];

		if (node.type == MapNodeType.Argument && (node.childrenOrder == null || node.childrenOrder.length != node.children.VKeys(true).length)) {
			let children = node.children.VKeys(true).map(id=>data.nodes[id]) as MapNode[];

			node.childrenOrder = node.children.VKeys(true).map(ToInt);
			let impactPremise = children.find(a=>data.nodeRevisions[a.currentRevision].impactPremise != null);
			if (impactPremise) {
				node.childrenOrder.Remove(impactPremise._id);
				node.childrenOrder.Insert(0, impactPremise._id);
			} else {
				console.log("Couldn't find impactPremise for node #" + node._id + "!");
			}
		}
	}

	return data;
});*/
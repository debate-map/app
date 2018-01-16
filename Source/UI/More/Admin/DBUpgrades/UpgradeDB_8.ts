import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc} from "../../Admin";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {FirebaseData} from "../../../../Store/firebase";
import {MapNodeRevision} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import {MapNode, ChildEntry, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {GetTreeNodesInObjTree} from "js-vextensions";

let newVersion = 8;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = Clone(oldData) as FirebaseData;

	// merge SupportingArgument and OpposingArgument
	// ==========

	for (let node of data.nodes.VValues(true)) {
		if (node.type == MapNodeType.Argument && (node.childrenOrder == null || node.childrenOrder.length != node.children.VKeys(true).length)) {
			node.childrenOrder = node.children.VKeys(true).map(ToInt);
		}
	}

	return data;
});
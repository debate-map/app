import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc} from "../../Admin";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {FirebaseData} from "../../../../Store/firebase";
import {MapNodeRevision} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import {MapNode, ChildEntry, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {GetTreeNodesInObjTree} from "js-vextensions";

let newVersion = 9;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = Clone(oldData) as FirebaseData;

	// remove impactPremise prop
	// ==========

	for (let revision of data.nodeRevisions.VValues(true)) {
		if (revision["impactPremise"]) {
			revision.argumentType = revision["impactPremise"].ifType;
			delete revision["impactPremise"];
		}
	}

	// add empty revision.titles if missing
	// ==========

	for (let revision of data.nodeRevisions.VValues(true)) {
		if (revision.titles == null) {
			revision.titles = {base: ""};
		}
	}

	// find arguments with more than one premise, and mark them as multi-premise arguments
	// ==========

	for (let node of data.nodes.VValues(true)) {
		if (node.type == MapNodeType.Argument) {
			let children = node.children.VKeys(true).map(id=>data.nodes[id]);
			let childClaims = children.filter(a=>a.type == MapNodeType.Claim);
			if (childClaims.length > 1) {
				node.multiPremiseArgument = true;
			}
		}
	}

	return data;
});
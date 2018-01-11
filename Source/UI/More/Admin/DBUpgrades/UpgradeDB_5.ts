import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc} from "../../Admin";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {FirebaseData} from "../../../../Store/firebase";

/*let newVersion = 5;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = FromJSON(ToJSON(oldData)) as FirebaseData;

	for (let node of data.nodes.VValues(true) as any[]) {
		// from old
		delete node.current.impactPremise_ifType;
		delete node.current.impactPremise_thenType;
		if (node.current.contentNode) {
			for (let chain of node.current.contentNode.sourceChains) {
				for (let source of chain as Source[]) {
					if (source.link != null && !source.link.startsWith("http")) {
						source.link = "http://" + source.link;
					}
				}
			}
		}

		delete node.chainAfter;
		if (node.children && IsArgumentNode(node)) {
			node.childrenOrder = node.children.VKeys(true).map(a=>a.ToInt());
			let impactPremiseNode = node.children.VKeys(true).map(id=>data.nodes[id]).find(a=>a.impactPremise);
			if (impactPremiseNode) {
				node.childrenOrder.Remove(impactPremiseNode._id);
				node.childrenOrder.Insert(0, impactPremiseNode._id);
			}
		}
	}

	return data;
});*/
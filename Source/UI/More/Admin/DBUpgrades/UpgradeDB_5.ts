import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc} from "../../Admin";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {FirebaseData} from "../../../../Store/firebase";
import {IsArgumentNode} from "../../../../Store/firebase/nodes/$node";

let newVersion = 5;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = FromJSON(ToJSON(oldData)) as FirebaseData;

	for (let node of data.nodes.VValues(true) as any[]) {
		// from old
		delete node.current.metaThesis_ifType;
		delete node.current.metaThesis_thenType;
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
			let metaThesisNode = node.children.VKeys(true).map(id=>data.nodes[id]).find(a=>a.metaThesis);
			if (metaThesisNode) {
				node.childrenOrder.Remove(metaThesisNode._id);
				node.childrenOrder.Insert(0, metaThesisNode._id);
			}
		}
	}

	return data;
});
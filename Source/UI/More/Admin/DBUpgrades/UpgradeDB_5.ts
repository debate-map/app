import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc} from "../../Admin";
import {ContentNode, SourceChain, Source, SourceType} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {FirebaseData} from "../../../../Store/firebase";

let newVersion = 5;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = FromJSON(ToJSON(oldData)) as FirebaseData;

	for (let node of data.nodes.VValues(true) as any[]) {
		delete node.chainAfter;
		if (node.children) {
			node.childrenOrder = node.children.VKeys(true).map(a=>a.ToInt());
		}
	}

	return data;
});
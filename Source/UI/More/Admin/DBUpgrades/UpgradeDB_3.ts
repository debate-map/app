import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc, FirebaseData} from "../../Admin";

let newVersion = 3;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = FromJSON(ToJSON(oldData)) as FirebaseData;

	for (let node of data.nodes.VValues(true)) {
		if (node.quote && node.quote.sources) {
			for (let i in node.quote.sources) {
				node.quote.sources[i] = {name: "", link: node.quote.sources[i] as any as string};
			}
		}
	}

	return data;
});
import {GetDataAsync, envSuffix} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc, FirebaseData} from "../../Admin";

let newVersion = 2;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = FromJSON(ToJSON(oldData)) as FirebaseData;

	for (let node of data.nodes.VValues(true)) {
		let parentIDs = data.nodes.Props(true).filter(a=>a.value.children && a.value.children[node._id]).map(a=>a.name);
		for (let parentID of parentIDs)
			node.parents = {...node.parents, [parentID]: {_: true}};
	}

	return data;
});
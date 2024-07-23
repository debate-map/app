import {sleep} from "k6";
import {ServerLink} from "./@Shared/ServerLink.js";
import {GetAccessPolicies, GetMaps} from "./@Shared/DMRead.js";
import {RunCommand_AddMap, RunCommand_AddX} from "./@Shared/DMWrite.js";

export const options = {
	iterations: 2,
	//maxDuration: '30s',
	//vus: 10,
	/*stages: [
		{target: 1, duration: "30s"},
	],*/
};

export default async function() {
	try {
		await Main();
	} /*catch (ex) {
		console.error(ex);
		throw ex;
	}*/ finally {
		sleep(1);
		//await new Promise(resolve=>setTimeout(resolve, 1000));
	}
}
async function Main() {
	const link = new ServerLink({});
	await link.OnReady();

	const policies = await GetAccessPolicies(link);
	const policyID = policies.find(a=>a.name == "Public, ungoverned (standard)").id;

	const id = await RunCommand_AddMap(link, {
		name: `K6_Depth0_${new Date().toLocaleString("sv")}`,
		accessPolicy: policyID,
		defaultExpandDepth: 2,
		editors: [],
		extras: {},
	});
	console.log("Created map with id:", id);
}
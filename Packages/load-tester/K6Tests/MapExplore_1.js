import {ServerLink} from "./@Shared/ServerLink.js";
import {GetMaps} from "./@Shared/DMRead.js";

const mainScenarioOptions = {
	//executor: "ramping-arrival-rate",
	//timeUnit: "1s",
	//preAllocatedVUs: 5,
	//startRate: 50,
	stages: [
		{target: 10, duration: "30s"}, // linearly go from 0 iters/s to 10 iters/s over 30s
		{target: 30, duration: "10m"}, // continue going higher
	],
};
export const options = mainScenarioOptions;

export default function() {
	Main();
}
function Main() {
	const link = new ServerLink({}, async()=>{
		const maps = await GetMaps(link);
		console.log("Maps:", maps);
	});
}
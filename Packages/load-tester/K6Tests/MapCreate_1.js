import {ServerLink} from "./@Shared/ServerLink.js";
import {GetMaps} from "./@Shared/DMRead.js";

export const options = {
	stages: [
		{target: 1, duration: "30s"},
	],
};

export default function() {
	Main();
}
function Main() {
	const link = new ServerLink({}, async()=>{
		// todo
	});
}
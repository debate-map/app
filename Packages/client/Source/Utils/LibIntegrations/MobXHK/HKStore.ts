import {SleepAsync} from "web-vcore/.yalc/js-vextensions";
import {hkAddress} from "./HKInitBackend";

export class HKStore {
	static main = new HKStore();
	//constructor() {}

	Start(accessToken: string) {
		const websocket = new WebSocket(`${hkAddress.replace("http", "ws")}/ws`);
		websocket.addEventListener("open", async event=>{
			console.log("Sending access-token:", accessToken);
			websocket.send(JSON.stringify({token: accessToken}));
			await SleepAsync(1000);

			console.log("Starting listen on source \"main\".");
			websocket.send(JSON.stringify({
				cmd: "listen", source: "main",
				name: `main_dm_${Date.now()}`, // set time-based name, so each page-refresh has its own listener/cursor
			}));
			await SleepAsync(1000);
		});
		// listen for messages
		websocket.addEventListener("message", event=>{
			const message = JSON.parse(event.data);
			console.log("HKStore websocket message:", message);
		});
	}
}
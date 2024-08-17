import {O, RunInAction} from "web-vcore";
import {Clone, SleepAsync} from "js-vextensions";
import {CreateAccessor} from "mobx-graphlink";
import {makeObservable} from "mobx";
import {hkHandlers, hkHandlers_active} from "./HKHandlers";
import {hkAddress} from "./HKInitBackend";

export class HKEvent<T = any> {
	source: string;
	created: string;
	creator: string;
	data: T;
}

export class HKStore {
	//static main: HKStore;
	constructor() {
		makeObservable(this);
	}

	accessToken: string;
	@O events = [] as HKEvent[];

	async Start(accessToken: string) {
		this.accessToken = accessToken;
		await this.GetInitialData();
		await this.StartWebsocket();
	}

	async GetInitialData() {
		const response = await fetch(`${hkAddress}/source/main/events?limit=500`);
		const events = await response.json();
		console.log("HKStore initial events:", events);
		RunInAction("HKStore.GetInitialData", ()=>this.events = events);
	}

	websocket: WebSocket;
	nextReconnectDelay = 0;
	async StartWebsocket() {
		this.websocket = new WebSocket(`${hkAddress.replace("http", "ws")}/ws`);
		this.websocket.addEventListener("open", async e=>{
			console.log("Sending access-token:", this.accessToken);
			this.websocket.send(JSON.stringify({token: this.accessToken}));
			//await SleepAsync(1000);

			console.log("Starting listen on source \"main\".");
			this.websocket.send(JSON.stringify({
				cmd: "listen", source: "main",
				processor: `main_dm_${Date.now()}`, // set time-based name, so each page-refresh has its own listener/cursor
			}));
			//await SleepAsync(1000);
		});
		this.websocket.addEventListener("close", async e=>{
			console.log("HK websocket closed; reconnecting.");
			await SleepAsync(this.nextReconnectDelay);
			this.StartWebsocket();
			this.nextReconnectDelay = (this.nextReconnectDelay + 1000).KeepAtMost(60000);
		});
		// listen for messages
		this.websocket.addEventListener("message", e=>{
			const message = JSON.parse(e.data);
			if ("data" in message && "source" in message) {
				const event = message as HKEvent;
				console.log("HK event received:", event);

				const copyOfEventAlreadyCommitted = this.events.find(a=>a.created == event.created);
				if (copyOfEventAlreadyCommitted) {
					console.log("Event already committed; ignoring.");
					return;
				}

				RunInAction("HKStore.ReceiveNewEvent", ()=>this.events.push(event));
			} else {
				console.log("HK websocket non-event message received:", message);
			}
		});
	}
}
// define this afterward, so that decorations are attached prior to the constructor being called (since it calls "makeObservable")
export const hkStore = new HKStore();

export class Node_HK {
	"@id": string;
	title: {"@value": string, "@lang": string};
}

export const GetEventsForTopic = CreateAccessor((id: string)=>{
	return hkStore.events.filter(event=>event.data.topic == `urn:uuid:${id}`);
});

/*export const GetNodes_HK = CreateAccessor(()=>{
	const events = HKStore.main.events;
});*/
export const GetNode_HK = CreateAccessor((id: string)=>{
	let node: Node_HK|n = null;
	const events = GetEventsForTopic(id); // separate line, for easier debugging
	for (const event of events) {
		const eventType = event.data["@type"];
		const handler = hkHandlers_active.find(a=>a.event_type == eventType)?.handler;
		if (handler) {
			// clone "event" and "node" before passing in, so that the handlers can only mutate their own copy, not that in the hk-store
			node = handler(Clone(event), {topic: Clone(node)});
		} else {
			console.warn(`No handler found for event-type: ${eventType}`);
		}
	}
	return node;
});
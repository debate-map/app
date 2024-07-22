import {WebSocket} from "k6/experimental/websockets";
import {url, jwt, GenReqID} from "./General.js";

const lastAutoOperationNumber = 0;

export class ServerLink {
	constructor(/** @type {Partial<ServerLink>} */ data, onopen) {
		Object.assign(this, {
			url,
			jwt,
		}, data);
		if (onopen) this.onopen = onopen;
		this.CreateWebsocket();
	}

	url;
	jwt;
	onopen;
	/** @type {WebSocket} */
	ws;

	CreateWebsocket() {
		const ws = this.ws = new WebSocket(url, ["graphql-transport-ws"], {
			//headers: GetHeaders(),
		});
		ws.onopen = ()=>{
			//console.log("WebSocket connection established!");
			ws.send(JSON.stringify({
				type: "connection_init",
				payload: {
					authorization: `Bearer ${this.jwt}`,
				},
			}));
			//console.log("Websocket message connection_init message.");

			this.onopen();
		};
		ws.onmessage = data=>{
			//console.log(`a message received: ${JSON.stringify(data)}`);
		};
		ws.onclose = function() {
			console.log("Closed");
		};
		ws.onerror = e=>{
			console.log("Error:", e);
		};
		return ws;
	}

	async Query(payload) {
		return await this.QueryOrSubscribeTemp(payload, "query");
	}
	async SubscribeTemp(payload) {
		return await this.QueryOrSubscribeTemp(payload, "subscribe");
	}
	/*async Subscribe(payload) {
		return await this.QueryOrSubscribe(payload, "subscribe");
	}*/
	async QueryOrSubscribeTemp(payload, type) {
		//payload.operationName = payload.operationName || `K6AutoOp_${++lastAutoOperationNumber}`;
		return new Promise((resolve, reject)=>{
			const reqID = GenReqID();
			this.ws.send(JSON.stringify({
				id: reqID,
				type,
				payload,
			}));
			let lastDataMessage;
			this.ws.addEventListener("message", data=>{
				if (data.type != "message") return;
				const msg = JSON.parse(data.data);
				if (msg.id != null && msg.id != reqID) return;

				if (msg.type == "error") {
					//console.log("Error:", msg.payload);
					reject(msg.payload);
				} else if (msg.type == "next") {
					//console.log("Next:", msg);
					lastDataMessage = msg;
					if (type == "subscribe") {
						this.ws.send(JSON.stringify({type: "stop", id: reqID}));
					}
				} else if (msg.type == "complete") {
					//console.log("Complete:", msg);
					resolve(lastDataMessage.payload.data);
				}
			});
		});
	}
}
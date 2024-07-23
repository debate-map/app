import {WebSocket} from "k6/experimental/websockets";
import http from "k6/http";
import {url, jwt, GenReqID} from "./General.js";

const lastAutoOperationNumber = 0;

export class ServerLink {
	constructor(/** @type {Partial<ServerLink>} */ data, onopen) {
		Object.assign(this, {
			url,
			jwt,
			isReady: false,
		}, data);
		if (onopen) this.onopen = onopen;
		this.CreateWebsocket();
	}

	url;
	jwt;
	isReady;
	onopen;
	/** @type {WebSocket} */
	ws;

	async OnReady() {
		return new Promise(resolve=>{
			if (this.isReady) resolve();
			else this.ws.addEventListener("open", resolve);
		});
	}

	CreateWebsocket() {
		const ws = this.ws = new WebSocket(url.replace("http", "ws"), ["graphql-transport-ws"], {
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
			this.isReady = true;

			if (this.onopen) this.onopen();
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

	async Query(body) {
		const response = http.post(this.url, JSON.stringify(body), {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.jwt}`,
			},
		});
		const responseStr = response.body.toString();
		if (!responseStr.startsWith("[") && !responseStr.startsWith("{")) {
			throw new Error(`Response is not JSON: ${responseStr}`);
		}
		const json = response.json();
		if (json.errors) {
			throw new Error(`Errors in response: ${JSON.stringify(json.errors)}`);
		}
		return json.data;
	}

	async Mutate(body) {
		/*const reqID = GenReqID();
		const body = {
			id: reqID,
			type: "mutate",
			payload,
		};*/
		const response = http.post(this.url, JSON.stringify(body), {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.jwt}`,
			},
		});
		const responseStr = response.body.toString();
		if (!responseStr.startsWith("[") && !responseStr.startsWith("{")) {
			throw new Error(`Response is not JSON: ${responseStr}`);
		}
		const json = response.json();
		if (json.errors) {
			throw new Error(`Errors in response: ${JSON.stringify(json.errors)}`);
		}
		return json.data;
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
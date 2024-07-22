import {randomString, randomIntBetween} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";
//import ws from "k6/ws";
import {WebSocket} from "k6/experimental/websockets";
import http from "k6/http";
import {check, sleep} from "k6";

// To run this load-testing script:
// 1) Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6
// 2) Open terminal to the "K6Tests" folder
// 3) Run this command: `k6 run MapExplore_1.js`

const url = `ws://localhost:5100/app-server/graphql`;
const jwt = open("../../../.env").split("\n").find(a=>a.includes("DM_USER_JWT_DEV")).split("=")[1].trim();

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
//const jwt = process.env.DM_USER_JWT_DEV;

export default function() {
	console.log("Test1");
	Main();
}

function GenReqID() {
	return `515609ec-3d5b-414e-ade8-${randomString(12)}`;
}

function Main() {
	const ws = new WebSocket(url, ["graphql-transport-ws"], {
		//headers: GetHeaders(),
	});
	ws.onopen = ()=>{
		console.log("WebSocket connection established!");
		//ws.send(JSON.stringify({event: "SET_NAME", new_name: `Croc 6575:997`}));
		ws.send(JSON.stringify({
			type: "connection_init",
			payload: {
				authorization: `Bearer ${jwt}`,
			},
		}));
		console.log("Websocket message sent 1");
		ws.send(JSON.stringify({
			id: GenReqID(),
			type: "subscribe",
			payload: {
				variables: {id: "LA1WD5rFT4SNX9epxP5dnQ"},
				extensions: {},
				operationName: "DocInCollection_users",
				query: "subscription DocInCollection_users($id: String!) {\n  user(id: $id) {\n    id\n    displayName\n    photoURL\n    joinDate\n    permissionGroups\n    edits\n    lastEditAt\n  }\n}",
			},
		}));
		console.log("Websocket message sent 2");
	};

	ws.onmessage = data=>{
		console.log(`a message received: ${JSON.stringify(data)}`);
	};

	ws.onclose = function() {
		console.log("Closed");
	};
	ws.onerror = e=>{
		console.log("Error:", e);
	};
}
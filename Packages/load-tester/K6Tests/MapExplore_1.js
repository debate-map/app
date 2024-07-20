import {randomString, randomIntBetween} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";
//import ws from "k6/ws";
import {WebSocket} from "k6/experimental/websockets";
import http from "k6/http";
import {check, sleep} from "k6";

// To run this load-testing script:
// 1) Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6
// 2) Open terminal to the "K6Tests" folder
// 3) Run this command: `k6 run MapExplore_1.js`

//import "../../../node_modules/dotenv/lib/main.js";
const url = `ws://localhost:5100/app-server/graphql`;
//const jwt = process.env.DM_USER_JWT_DEV;
const jwt = open("../../../.env").split("\n").find(a=>a.includes("DM_USER_JWT_DEV")).split("=")[1].trim();

const sessionDuration = randomIntBetween(10000, 60000); // user session between 10s and 1m
const chatRoomName = "publicRoom"; // choose your chat room name

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

/*export const options = {
	//scenarios: {
	//	contacts: {
};*/
export const options = mainScenarioOptions;

export default function() {
	console.log("Test1");
	//WS1();
	WS2();
}

function GetHeaders() {
	return [
		{
			name: "Pragma",
			value: "no-cache",
		},
		{
			name: "Origin",
			value: "http://localhost:5101",
		},
		{
			name: "Accept-Encoding",
			value: "gzip, deflate, br, zstd",
		},
		{
			name: "Host",
			value: "localhost:5100",
		},
		{
			name: "Accept-Language",
			value: "en-US,en;q=0.9,bn;q=0.8,hy;q=0.7,ru;q=0.6",
		},
		/*{
			name: "Sec-WebSocket-Key",
			value: "TGuDzWVsLOwIpM0+W2AIcQ==",
		},*/
		{
			name: "User-Agent",
			value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
		},
		{
			name: "Upgrade",
			value: "websocket",
		},
		{
			name: "Cache-Control",
			value: "no-cache",
		},
		{
			name: "Sec-WebSocket-Protocol",
			value: "graphql-transport-ws",
		},
		{
			name: "Connection",
			value: "Upgrade",
		},
		{
			name: "Sec-WebSocket-Version",
			value: "13",
		},
		{
			name: "Sec-WebSocket-Extensions",
			value: "permessage-deflate; client_max_window_bits",
		},
	];
}

function WS1() {
	const params = {
		//tags: {my_tag: "my ws session"},
		headers: GetHeaders(),
	};

	const res = ws.connect(url, params, socket=>{
		console.log("Test2");
		socket.on("open", ()=>{
			console.log(`VU ${__VU}: connected`);

			socket.send(JSON.stringify({event: "SET_NAME", new_name: `Croc ${__VU}`}));

			socket.setInterval(()=>{
				socket.send(JSON.stringify({event: "SAY", message: `I'm saying ${randomString(5)}`}));
			}, randomIntBetween(2000, 8000)); // say something every 2-8seconds
		});

		socket.on("ping", ()=>{
			console.log("PING!");
		});

		socket.on("pong", ()=>{
			console.log("PONG!");
		});

		socket.on("close", ()=>{
			console.log(`VU ${__VU}: disconnected`);
		});

		socket.on("error", e=>{
			console.log("Error:", e);
		});

		socket.on("message", message=>{
			const msg = JSON.parse(message);
			if (msg.event === "CHAT_MSG") {
				console.log(`VU ${__VU} received: ${msg.user} says: ${msg.message}`);
			} else if (msg.event === "ERROR") {
				console.error(`VU ${__VU} received:: ${msg.message}`);
			} else {
				console.log(`VU ${__VU} received unhandled message: ${msg.message}`);
			}
		});

		socket.setTimeout(()=>{
			console.log(`VU ${__VU}: ${sessionDuration}ms passed, leaving the chat`);
			socket.send(JSON.stringify({event: "LEAVE"}));
		}, sessionDuration);

		socket.setTimeout(()=>{
			console.log(`Closing the socket forcefully 3s after graceful LEAVE`);
			socket.close();
		}, sessionDuration + 3000);
	});

	check(res, {"Connected successfully": r=>{
		console.log("Checking:", r);
		return r && r.status === 101;
	}});
}

function WS2() {
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
			id: "515609ec-3d5b-414e-ade8-814154efd4d8",
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
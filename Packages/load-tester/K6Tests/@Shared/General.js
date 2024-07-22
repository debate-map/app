import {randomString, randomIntBetween} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

// To run these k6 scripts:
// 1) Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6
// 2) Open terminal to the "K6Tests" folder
// 3) Run this command: `k6 run SCRIPT_FILENAME.js`

export const url = `ws://localhost:5100/app-server/graphql`;
export const jwt = open("../../../../.env").split("\n").find(a=>a.includes("DM_USER_JWT_DEV")).split("=")[1].trim();

export function GenReqID() {
	return `515609ec-3d5b-414e-ade8-${randomString(12)}`;
}
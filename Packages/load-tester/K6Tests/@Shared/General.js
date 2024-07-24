import {randomString, randomIntBetween} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

export const url = `http://localhost:5100/app-server/graphql`;
export const jwt = open("../../../../.env").split("\n").find(a=>a.includes("DM_USER_JWT_DEV")).split("=")[1].trim();

export function GenReqID() {
	return `515609ec-3d5b-414e-ade8-${randomString(12)}`;
}
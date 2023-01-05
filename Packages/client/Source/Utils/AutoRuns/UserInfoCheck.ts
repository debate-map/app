import {AttachUserJWTToWebSocketConnection} from "Utils/LibIntegrations/Apollo";
import {graph} from "Utils/LibIntegrations/MobXGraphlink";
import {AddNotificationMessage} from "web-vcore";
import {Timer} from "web-vcore/nm/js-vextensions";

type StandardJWTFields = {
	// header
	"alg": "HS256",
	"typ": "JWT"
	// payload
	"iat": number,
	"exp": number,
	"nbf": number,
};
// source struct is `UserInfoForJWT` in jwt_utils.rs
type CustomJWTFields = {
	"id": string,
	"email": string,
};

function ParseJWT(token: string) {
	// from: https://stackoverflow.com/a/38552302
	var base64Url = token.split(".")[1];
	var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
	var jsonPayload = decodeURIComponent(window.atob(base64).split("").map(c=>{
		return `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`;
	}).join(""));

	return JSON.parse(jsonPayload) as StandardJWTFields & CustomJWTFields;
}

export function GetUserInfoJWTString() {
	return localStorage.getItem("debate-map-user-jwt");
}
export function GetUserInfoFromStoredJWT() {
	// get the authentication token from local storage if it exists
	const token = GetUserInfoJWTString();
	if (token == null) return null;
	return ParseJWT(token);
}

export function OnUserJWTChanged() {
	//SendUserJWTToMGL();
	AttachUserJWTToWebSocketConnection();
}

// /** Call this once at startup (currently done at start of InitApollo()), and whenever the stored user-jwt changes. */
/** Call this whenever the jwt-data attached to the websocket connection is has changed. (so that requests are re-made, with the new auth-data) */
export async function SendUserJWTToMGL() {
	const userInfoFromToken = GetUserInfoFromStoredJWT();
	if (userInfoFromToken != null) {
		await graph.SetUserInfo({id: userInfoFromToken.id});
	} else {
		await graph.SetUserInfo(null);
	}
}

// Once per minute, try to validate the token; if it's expired (or close to expiring), then delete the token and call RefreshUserInfoFromStoredJWT().
// This will cause the user to be logged out, making it visible to them that they then have to sign-in again. (which is needed for their commands to go through)
export const userInfoCheckTimer = new Timer(60000, ()=>{
	CheckIfUserInfoTokenExpired();
}).Start(0); // run once immediately, then once per minute

const XMinsAsMS = (x: number)=>x * 60 * 1000;
let timeOfLastSignInWarning = -1;
function CheckIfUserInfoTokenExpired() {
	const userInfoFromToken = GetUserInfoFromStoredJWT();
	if (userInfoFromToken == null) return;

	const now = Date.now();
	const timeOfTokenExpire = userInfoFromToken.exp * 1000; // convert to ms
	const timeOfTokenDestroy = timeOfTokenExpire - XMinsAsMS(10);
	const timeOfTokenWarn = timeOfTokenExpire - XMinsAsMS(60);
	//const timeAtWhichTokenBecomesValid = userInfoFromToken.nbf * 1000; // convert to ms

	// if token is expired, or it's in the brief period where it's valid but ignored/treated-as-expired by client, delete the token and request new sign-in (the 10min buffer is in case clocks are slightly off)
	if (now >= timeOfTokenExpire || now >= timeOfTokenDestroy) {
		localStorage.removeItem("debate-map-user-jwt");
		OnUserJWTChanged();
		// we say it's "already expired" to be less confusing (even if token is merely "almost expired", users won't care to know that implementation detail)
		AddNotificationMessage(`Your sign-in information has expired. Please sign-in again.`);
	}
	// else, if token will expire within an hour, simply warn the user (if we haven't already warned them in the last hour)
	else if (now >= timeOfTokenWarn && Date.now() - timeOfLastSignInWarning > XMinsAsMS(60)) {
		const minutesTillTokenDestroy = ((timeOfTokenDestroy - Date.now()) / 60000).RoundTo(1);
		// we say it will "expire in 50 minutes", because that is when the app will automatically destroy the token / sign them out
		AddNotificationMessage(`Your sign-in information will expire in ${minutesTillTokenDestroy} minutes. To avoid disruption, you can manually sign-out now then sign back in.`);
		timeOfLastSignInWarning = Date.now();
	}
}
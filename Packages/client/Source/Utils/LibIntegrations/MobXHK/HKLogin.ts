import {hkAddress, hkUser, hkPass} from "./HKInitBackend";

export async function HKLogIn() {
	const formData = new FormData();
	formData.append("grant_type", "password");
	formData.append("username", hkUser);
	formData.append("password", hkPass);
	const response = await fetch(`${hkAddress}/token`, {
		method: "POST",
		body: formData,
	});
	const responseJSON = await response.json();
	const {accessToken, token_type} = responseJSON as {accessToken: string, token_type: string};
	console.log("HKLogIn response:", responseJSON);
	return accessToken;
}
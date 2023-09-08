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
	console.log("HKLogIn response:", responseJSON);
	const {access_token, token_type} = responseJSON as {access_token: string, token_type: string};
	return access_token;
}
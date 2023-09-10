import {hkHandlersStr} from "./HKHandlers";
import {HKLogIn} from "./HKLogin";
import {hkSchemaStr} from "./HKSchema";

// temporary hard coded values for testing
export const hkAddress = "http://localhost:5140";
export const hkUser = "user";
export const hkPass = "pass";

// data
export const globalRootNodeID_hk = "00000000-0000-0000-0000-000000000001";

export async function HKInitBackend(firstStep = 0) {
	if (firstStep <= 0) if (!await HKCreateUser()) return;

	// this doesn't count as a "numbered step", since it's a log-in prerequisite for the others
	const accessToken = await HKLogIn();
	if (accessToken == null) return;

	if (firstStep <= 1) if (!await HKAddSchema(accessToken)) return;
	if (firstStep <= 2) if (!await HKAddHandlers(accessToken)) return;
	if (firstStep <= 3) if (!await HKAddSource(accessToken)) return;
	if (firstStep <= 4) if (!await HKAddRootNode(accessToken)) return;

	console.log("All steps for HKInitBackend completed!");
}

/** Returns true if user was just created; returns false if already existed. */
export async function HKCreateUser() {
	const response = await fetch(`${hkAddress}/agents`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json", // required by endpoint
		},
		body: JSON.stringify({
			email: "user@gmail.com",
			username: "user",
			//permissions: ["admin"],
			passwd: "pass",
		}),
	});
	const responseText = await response.text();
	console.log("CreateUser response:", responseText);

	// if hit error, assume user just already exists
	if (responseText == "Internal Server Error") {
		return false;
	}
	return true;
}

/** Returns schema-id if call succeeded; null otherwise. */
export async function HKAddSchema(accessToken: string) {
	const response = await fetch(`${hkAddress}/schema`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json", // required by endpoint
		},
		body: hkSchemaStr,
	});
	const responseText = await response.text();
	console.log("AddSchema response:", responseText);

	// for some reason, this fails to retrieve the "location" header, even if dev-tools shows it's there
	/*const schemaPath = await response.headers.get("location"); // example: "/schema/13"
	const schemaID = schemaPath != null ? Number(schemaPath.split("/")[2]) : null; // example: "13"
	return schemaID;*/

	return responseText.startsWith("{");
}

/** Returns true if call succeeded. */
export async function HKAddHandlers(accessToken: string) {
	const response = await fetch(`${hkAddress}/handler`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json", // required by endpoint
		},
		body: hkHandlersStr,
	});
	const responseText = await response.text();
	console.log("AddHandlers response:", responseText);

	return responseText.startsWith("[");
}

/** Returns true if call succeeded. */
export async function HKAddSource(accessToken: string) {
	const response = await fetch(`${hkAddress}/source`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json", // required by endpoint
		},
		body: JSON.stringify({local_name: "main"}),
	});
	const responseText = await response.text();
	console.log("AddSource response:", responseText);

	return responseText.startsWith("{");
}

/** Returns true if call succeeded. */
export async function HKAddRootNode(accessToken: string) {
	const response = await fetch(`${hkAddress}/source/main/events`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json", // required by endpoint
		},
		body: JSON.stringify({
			data: {
				topic: `urn:uuid:${globalRootNodeID_hk}`,
				title: {
					"@value": "Root",
					"@lang": "en",
				},
				"@type": "ex:create_node",
			},
		}),
	});

	const eventPath = await response.headers.get("location"); // example: "/source/main/events/2023-09-08 01:59:26.518288"
	const eventID = eventPath != null ? eventPath.split("/")[4] : null; // example: "2023-09-08 01:59:26.518288"

	const responseText = await response.text();
	console.log("AddRootNode response:", responseText);

	return responseText.startsWith("{");
}
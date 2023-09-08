import {hkHandlersStr} from "./HKHandlers";
import {HKLogIn} from "./HKLogin";
import {hkSchemaStr} from "./HKSchema";

// temporary hard coded values for testing
export const hkAddress = "http://localhost:5140";
export const hkUser = "user";
export const hkPass = "pass";

// data
export const globalRootNodeID_hk = "00000000-0000-0000-0000-000000000001";

export async function HKInitBackend() {
	await CreateUser();
	const accessToken = await HKLogIn();
	await HKAddSchema();
	await HKAddHandlers();
	await HKAddSource();
	await HKAddRootNode();
}

/** Returns true if user was just created; returns false if already existed. */
export async function CreateUser() {
	const response = await fetch(`${hkAddress}/agents`, {
		method: "POST",
		body: JSON.stringify({
			email: "user@gmail.com",
			username: "user",
			permissions: ["admin"],
			passwd: "pass",
		}),
	});
	const responseText = await response.text();
	// if hit error, assume user just already exists
	if (responseText == "Internal Server Error") {
		return false;
	}
	return true;
}

/** Returns schema-id if call succeeded; null otherwise. */
export async function HKAddSchema() {
	const response = await fetch(`${hkAddress}/schema`, {
		method: "POST",
		body: hkSchemaStr,
	});
	const schemaPath = await response.headers.get("Location"); // example: "/schema/13"
	const schemaID = schemaPath != null ? Number(schemaPath.split("/")[2]) : null; // example: "13"
	return schemaID;
}

/** Returns true if call succeeded. */
export async function HKAddHandlers() {
	const response = await fetch(`${hkAddress}/handler`, {
		method: "POST",
		body: hkHandlersStr,
	});
	const responseText = await response.text();
	return responseText.startsWith("[");
}

/** Returns true if call succeeded. */
export async function HKAddSource() {
	const response = await fetch(`${hkAddress}/source`, {
		method: "POST",
		body: JSON.stringify({local_name: "main"}),
	});
	const responseText = await response.text();
	return responseText.startsWith("{");
}

/** Returns true if call succeeded. */
export async function HKAddRootNode() {
	const response = await fetch(`${hkAddress}/source/main/events`, {
		method: "POST",
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

	const eventPath = await response.headers.get("Location"); // example: "/source/main/events/2023-09-08 01:59:26.518288"
	const eventID = eventPath != null ? eventPath.split("/")[4] : null; // example: "2023-09-08 01:59:26.518288"

	const responseText = await response.text();
	return responseText.startsWith("{");
}
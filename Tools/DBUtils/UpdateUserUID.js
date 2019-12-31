// For usage instructions, see here: https://stackoverflow.com/a/59535579/2441655

let admin = require("firebase-admin");

// config
let email = "XXX";
let serviceAccountData = require("../../../Others/Keys/AdminSDK_Key1.json");
let adminConfig = {
	credential: admin.credential.cert(serviceAccountData),
	databaseURL: "https://debate-map-prod.firebaseio.com",
};
let newUserOverrides = {
	uid: "XXX",
};

// If applicable: After the function is done, use the "reset password" option in the Firebase Admin Console, to have a password-reset email sent to the user, completing the account update.
Start();
async function Start() {
	console.log("Initializing firebase. databaseURL:", adminConfig.databaseURL);
	admin.initializeApp(adminConfig);

	console.log("Starting update for user with email:", email);
	let oldUser = await admin.auth().getUserByEmail(email);
	console.log("Old user found:", oldUser);

	await admin.auth().deleteUser(oldUser.uid);
	console.log("Old user deleted.");

	let dataToTransfer_keys = ["disabled", "displayName", "email", "emailVerified", "phoneNumber", "photoURL", "uid"];
	let newUserData = {};
	for (let key of dataToTransfer_keys) {
		newUserData[key] = oldUser[key];
	}
	Object.assign(newUserData, newUserOverrides);
	console.log("New user data ready: ", newUserData);

	let newUser = await admin.auth().createUser(newUserData);
	console.log("New user created: ", newUser);
}
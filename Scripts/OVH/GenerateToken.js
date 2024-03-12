require("dotenv").config();
const fs = require("fs");
var ovh = require("ovh")({
	endpoint: "ovh-us",
	appKey: process.env.OVH_APP_KEY,
	appSecret: process.env.OVH_APP_SECRET,
});

const consumerKeyPath = "../../Others/Secrets/consumerKey.txt";

ovh.request("POST", "/auth/credential", {
	accessRules: [
		{method: "GET", path: "/*"},
		{method: "POST", path: "/*"},
		{method: "PUT", path: "/*"},
		{method: "DELETE", path: "/*"},
	],
}, (error, credential)=>{
	console.log(error || credential); // open the url it logs to the console to complete validation

	const consumerKey = credential?.consumerKey;
	//const token = credential?.validationUrl.split("?credentialToken=")[1]; // temp; only needed during validation
	fs.writeFileSync(consumerKeyPath, consumerKey);
});
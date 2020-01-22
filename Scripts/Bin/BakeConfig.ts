import {CreateBakedConfigFile} from "vwebapp-framework/Scripts/Bin/BakeConfig";
import {config} from "../Config";

const pack = require("../../package.json");

CreateBakedConfigFile(config, "dev", {
	version: pack.version,
	firebaseConfig: {
		// use concatenation to make automated searches for g-cloud api-keys a bit harder (it should be ok if found; abuse would just be quota issues from foreign clients, if api-key misconfigured)
		apiKey: "AI" + "zaSyB1UCTO2p6TLpifAQzsRw_Np39k9N92cpI", // eslint-disable-line
		authDomain: "debate-map-dev.firebaseapp.com",
		databaseURL: "https://debate-map-dev.firebaseio.com",
		projectId: "debate-map-dev",
		// messagingSenderId: 'TODO',
		storageBucket: "debate-map-dev.appspot.com",
	},
});
CreateBakedConfigFile(config, "prod", {
	version: pack.version,
	firebaseConfig: {
		apiKey: "AI" + "zaSyCnvv_m-L08i4b5NmxGF5doSwQ2uJZ8i-0", // eslint-disable-line
		authDomain: "debate-map-prod.firebaseapp.com",
		databaseURL: "https://debate-map-prod.firebaseio.com",
		projectId: "debate-map-prod",
		// messagingSenderId: 'TODO',
		storageBucket: "debate-map-prod.appspot.com",
	},
});
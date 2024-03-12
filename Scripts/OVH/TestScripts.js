require("dotenv").config();
const fs = require("fs");

const consumerKeyPath = "../../Others/Secrets/consumerKey.txt";
const consumerKey = fs.readFileSync(consumerKeyPath, "utf8");
console.log("ConsumerKey:", consumerKey);

var ovh = require("ovh")({
	endpoint: "ovh-us",
	appKey: process.env.OVH_APP_KEY,
	appSecret: process.env.OVH_APP_SECRET,
	consumerKey,
	debug: true,
});

/*ovh.request(
	"GET",
	"/cloud/project/{serviceName}/kube/{kubeId}/customization",
	{
		serviceName: process.env.OVH_SERVICE_NAME,
		kubeId: process.env.OVH_KUBE_ID,
	},
	(err, data)=>{
		if (err) { throw err; }
		console.log(JSON.stringify(data, null, "  "));
	},
);*/

/*ovh.request(
	"PUT",
	"/cloud/project/{serviceName}/kube/{kubeId}/customization",
	{
		serviceName: process.env.OVH_SERVICE_NAME,
		kubeId: process.env.OVH_KUBE_ID,
		apiServer: {
			admissionPlugins: {
				enabled: [
					"AlwaysPullImages",
					"NodeRestriction",
				],
				disabled: [],
			},
			// custom (doens't work; doesn't accept other config options!)
			//serviceNodePortRange: "30001-32767",
		},
	},
	(err, data)=>{
		if (err) { throw err; }
		console.log(JSON.stringify(data, null, "  "));
	},
);*/
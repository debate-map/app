import {Output} from "@pulumi/pulumi";
import * as fs from "fs";

import {registryUrl} from "./SetUpGCR_ForDockerImages";
//import {} from "./BuildAppImagesAndDeploy"; // commented; we use Tilt for building+deploying images for now (both for dev and prod)
import {bucketName} from "./SetUpGCSBucket_UniformPrivate";

// export relevant outputs into the Kubernetes declaration files, by including them in Kustomize json-patch files at pre-determined locations
// ==========

function GetValue<T>(output: Output<T>) {
	return new Promise((resolve, reject)=>{
		output.apply(value=>{
			resolve(value);
		});
	});
}

(async()=>{
	//fs.writeFileSync("./PulumiOutput_Private.json", JSON.stringify({}));
	fs.writeFileSync("./PulumiOutput_Public.json", JSON.stringify({
		registryURL: await GetValue(registryUrl),
		bucket_uniformPrivate_url: await GetValue(bucketName),
	}));
})();
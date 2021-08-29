import {Output} from "@pulumi/pulumi";
import * as fs from "fs";

import {registryUrl} from "./SetUpGoogleContainerRegistry";
//import {} from "./BuildAppImagesAndDeploy"; // commented; we use Tilt for building+deploying images for now (both for dev and prod)
import {bucket_dev_uniformPrivate, bucket_prod_uniformPrivate} from "./SetUpGoogleStorageBuckets";

// export relevant outputs into the Kubernetes declaration files, by including them in Kustomize json-patch files at pre-determined locations
// ==========

function GetValue<T>(output: Output<T>) {
	return new Promise<T>((resolve, reject)=>{
		output.apply(value=>{
			resolve(value);
		});
	});
}

(async()=>{
	//fs.writeFileSync("./PulumiOutput_Private.json", JSON.stringify({}));
	const bucket_dev_uniformPrivate_gsPseudoURL = await GetValue(bucket_dev_uniformPrivate.url);
	const bucket_prod_uniformPrivate_gsPseudoURL = await GetValue(bucket_prod_uniformPrivate.url);
	fs.writeFileSync("./PulumiOutput_Public.json", JSON.stringify({
		registryURL: await GetValue(registryUrl),
		bucket_dev_uniformPrivate_url: bucket_dev_uniformPrivate_gsPseudoURL.replace("gs://", "https://storage.googleapis.com/"),
		bucket_dev_uniformPrivate_name: bucket_dev_uniformPrivate_gsPseudoURL.replace("gs://", ""),
		bucket_prod_uniformPrivate_url: bucket_prod_uniformPrivate_gsPseudoURL.replace("gs://", "https://storage.googleapis.com/"),
		bucket_prod_uniformPrivate_name: bucket_prod_uniformPrivate_gsPseudoURL.replace("gs://", ""),
	}, null, "\t"));
})();
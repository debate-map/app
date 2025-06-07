import * as gcp from "@pulumi/gcp";

export const bucket_dev_uniformPrivate = new gcp.storage.Bucket("debate-map-dev-uniform-private", {
	location: "us-west1",
	uniformBucketLevelAccess: true,
});

export const bucket_prod_uniformPrivate = new gcp.storage.Bucket("debate-map-prod-uniform-private", {
	location: "us-west1",
	uniformBucketLevelAccess: true,
});
import * as gcp from "@pulumi/gcp";

export const bucket_dev_uniformPrivate = new gcp.storage.Bucket("debate-map-dev-uniform-private", {
	uniformBucketLevelAccess: true,
});

export const bucket_prod_uniformPrivate = new gcp.storage.Bucket("debate-map-prod-uniform-private", {
	uniformBucketLevelAccess: true,
});
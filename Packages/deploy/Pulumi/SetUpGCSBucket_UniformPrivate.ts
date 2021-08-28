import * as gcp from "@pulumi/gcp";

// create a GCP resource (storage bucket)
export const bucket = new gcp.storage.Bucket("debate-map-prod-uniform-private", {
	uniformBucketLevelAccess: true,
});
export const bucketName = bucket.url;
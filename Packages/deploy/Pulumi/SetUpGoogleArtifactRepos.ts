import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// old: create a private GCR registry
/*export const registry = new gcp.container.Registry("main-registry");
export const registryUrl = registry.id.apply(_=>gcp.container.getRegistryRepository().then(reg=>reg.repositoryUrl));*/

// new: create a private artifact repository
export const mainRepo = new gcp.artifactregistry.Repository("main-repo-resource", {
	repositoryId: "main-repo",
	location: "us-west1", // must be lowercase for some reason! (else get: `Error creating Repository: googleapi: Error 400: invalid project: "projects/debate-map-prod/locations/US-WEST1"`)
	format: "DOCKER",
});
//export const mainRepoId = mainRepo.id.apply(id=>id);
/*export const mainRepoUrl = await (async()=>{
	const location = mainRepo.location.get();
	const projectId = mainRepo.project.get();
	const repositoryId = mainRepo.name.get();
	return `${location}-docker.pkg.dev/${projectId}/${repositoryId}`;
})();*/
export const mainRepoUrl = pulumi.all([mainRepo.location, mainRepo.project, mainRepo.name]).apply(([location, projectId, repositoryId])=>{
	return `${location}-docker.pkg.dev/${projectId}/${repositoryId}`;
});
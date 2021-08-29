import * as gcp from "@pulumi/gcp";

// create a private GCR registry
export const registry = new gcp.container.Registry("main-registry");
export const registryUrl = registry.id.apply(_=>gcp.container.getRegistryRepository().then(reg=>reg.repositoryUrl));
import * as docker from "@pulumi/docker";
import {registryUrl} from "./SetUpGoogleContainerRegistry";

const deploysEnabled = {
	sharedBase: true,
	webServer: true,
	appServer: true,
};

/*if (deploysEnabled.sharedBase) {
	var jsBase_info = DeployPackage("Packages/deploy/@JSBase/Dockerfile", {imageName_base: "dm-js-base"});
}
export const jsBase_baseImageName = jsBase_info!.baseImageName;
export const jsBase_fullImageName = jsBase_info!.fullImageName;*/

// todo: probably need to add the rust-base dockerfile here (well, either that or remove the entries below, since they're likely either all needed or all not needed)

if (deploysEnabled.webServer) {
	var webServer_info = DeployPackage("Packages/web-server/Dockerfile", {imageName_base: "dm-web-server"});
}
export const webServer_baseImageName = webServer_info!.baseImageName;
export const webServer_fullImageName = webServer_info!.fullImageName;

if (deploysEnabled.appServer) {
	var appServer_info = DeployPackage("Packages/app-server/Dockerfile", {imageName_base: "dm-app-server"});
}
export const appServer_baseImageName = appServer_info!.baseImageName;
export const appServer_fullImageName = appServer_info!.fullImageName;

// todo: add code for the other packages
// [edit: actually, I don't think these steps are needed; tilt has auth to push with whatever image-name it needs; pulumi apparently doesn't need to pre-create them]

function DeployPackage(pathToDockerfile: string, opts: {imageName_base: string, imageName_final?: string}) {
	// Get registry info (creds and endpoint).
	const imageName_final = opts.imageName_final ? opts.imageName_final : registryUrl.apply(url=>`${url}/${opts.imageName_base}`);
	const registryInfo = undefined; // use gcloud for authentication.

	// Build and publish the container image.
	const image = new docker.Image(opts.imageName_base, {
		build: {
			context: ".",
			dockerfile: pathToDockerfile,
		},
		imageName: imageName_final,
		registry: registryInfo,
	}, {
	});

	// Export the base and specific version image name.
	return {
		baseImageName: image.baseImageName,
		fullImageName: image.imageName,
	};
}
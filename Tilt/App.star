# imports
# ==========

# other tilt extensions
load('./@Extensions/helm_remote.star', 'helm_remote')
load('ext://helm_resource', 'helm_resource', 'helm_repo')
# custom tilt files
load('./Utils.star', 'ReplaceInBlob', 'ReadFileWithReplacements', 'ModifyLineRange', 'Base64Encode', 'GetDateTime')
load('./K8sUtils.star', 'NEXT_k8s_resource', 'GetLastResourceNamesBatch', 'AddResourceNamesBatch_IfValid', 'NEXT_k8s_resource_batch', 'k8s_yaml_grouped', 'CreateNamespace', 'CreateNamespaces')

# main
# ==========

# this unfortunately is a separate instance from that in root Tiltfile; might be okay in some cases
#g = {"appliedResourceNames_batches": []}

def Start_App(g):
	ENV = g["ENV"]

	#nmWatchPathsStr = str(local(['node', '-e', "console.log(require('../Scripts/NodeModuleWatchPaths.js').nmWatchPaths.join(','))"]))
	#nmWatchPaths = nmWatchPathsStr.strip().split(",")
	# this keeps the NMOverwrites folder up-to-date, with the live contents of the node-module watch-paths (as retrieved above)
	#local(['npx', 'file-syncer', '--from'] + nmWatchPaths + ['--to', 'NMOverwrites', '--replacements', 'node_modules/web-vcore/node_modules/', 'node_modules/', '--clearAtLaunch', '--async', '--autoKill'])

	# rust
	# -----

	# this is the nodejs-base dockerfile used for all subsequent rust images
	imageURL_rustBase = g["registryURL"] + '/dm-rust-base-' + ENV
	docker_build(imageURL_rustBase, '..', dockerfile='../Packages/deploy/@RustBase/Dockerfile',
		build_args={
			#"ENVIRONMENT": ENV, # not needed here atm
		},
	)

	rustProfile = ("release" if g["compileWithRelease"] else "dev") + ("_clif" if g["compileWithCranelift"] else "")
	def CopyFromPath(packageName, usedCranelift = g["compileWithCranelift"], usedRelease = g["compileWithRelease"]):
		# we have to hard-code these branches, since rust outputs "dev" profile into the "debug" folder fsr (also simplifies underscore handling)
		if usedCranelift:
			if usedRelease: return "/dm_repo/target/release_clif/" + packageName
			else:           return "/dm_repo/target/dev_clif/" + packageName
		else:
			if usedRelease: return "/dm_repo/target/release/" + packageName
			else:           return "/dm_repo/target/debug/" + packageName

	imageURL_monitorBackend = g["registryURL"] + '/dm-monitor-backend-' + ENV
	docker_build(imageURL_monitorBackend, '..', dockerfile='../Packages/monitor-backend/Dockerfile',
		build_args={
			"RUST_BASE_URL": imageURL_rustBase,
			"ENVIRONMENT": ENV,
			"debug_vs_release": "release" if g["compileWithRelease"] else "debug",
			"debug_vs_release_profile": rustProfile,
			# docker doesn't seem to support string interpolation in COPY command, so do it here
			"copy_from_path": CopyFromPath("monitor-backend"),
		},
	)
	imageURL_webServer = g["registryURL"] + '/dm-web-server-' + ENV
	docker_build(imageURL_webServer, '..', dockerfile='../Packages/web-server/Dockerfile',
		build_args={
			"RUST_BASE_URL": imageURL_rustBase,
			"ENVIRONMENT": ENV,
			"debug_vs_release": "release" if g["compileWithRelease"] else "debug",
			"debug_vs_release_profile": rustProfile,
			# docker doesn't seem to support string interpolation in COPY command, so do it here
			"copy_from_path": CopyFromPath("web-server"),
		},
	)
	imageURL_appServer = g["registryURL"] + '/dm-app-server-' + ENV
	docker_build(imageURL_appServer, '..', dockerfile='../Packages/app-server/Dockerfile',
		build_args={
			"RUST_BASE_URL": imageURL_rustBase,
			"ENVIRONMENT": ENV,
			"debug_vs_release": "release" if g["compileWithRelease"] else "debug",
			"debug_vs_release_profile": rustProfile,
			# docker doesn't seem to support string interpolation in COPY command, so do it here
			"copy_from_path": CopyFromPath("app-server"),
		},
	)

	# own app (deploy to kubernetes)
	# ==========

	k8s_yaml(ReadFileWithReplacements('../Packages/monitor-backend/deployment.yaml', {
		"TILT_PLACEHOLDER:imageURL_monitorBackend": imageURL_monitorBackend,
	}))
	k8s_yaml(ReadFileWithReplacements('../Packages/web-server/deployment.yaml', {
		"TILT_PLACEHOLDER:imageURL_webServer": imageURL_webServer,
	}))
	k8s_yaml(ReadFileWithReplacements('../Packages/app-server/deployment.yaml', {
		"TILT_PLACEHOLDER:imageURL_appServer": imageURL_appServer,
	}))

	# port forwards (see readme's [project-service-urls] guide-module for details)
	# ==========

	NEXT_k8s_resource_batch(g, [
		{
			"workload": 'dm-web-server', "labels": ["app"],
			"trigger_mode": TRIGGER_MODE_MANUAL, # probably temp (can remove once client.build.prodQuick stops clearing the Dist folder prior to the new contents being available)
		},
		{
			"workload": 'dm-app-server', "labels": ["app"],
			# Why manual? Because I want to avoid: type, save, [compile starts without me wanting it to], type and save again, [now I have to wait longer because the previous build is still running!]
			"trigger_mode": TRIGGER_MODE_MANUAL,
		},
		{
			"workload": 'dm-monitor-backend', "labels": ["app"],
			"trigger_mode": TRIGGER_MODE_MANUAL,
		},
	])
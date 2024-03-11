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
	#nmWatchPathsStr = str(local(['node', '-e', "console.log(require('../Scripts/NodeModuleWatchPaths.js').nmWatchPaths.join(','))"]))
	#nmWatchPaths = nmWatchPathsStr.strip().split(",")
	# this keeps the NMOverwrites folder up-to-date, with the live contents of the node-module watch-paths (as retrieved above)
	#local(['npx', 'file-syncer', '--from'] + nmWatchPaths + ['--to', 'NMOverwrites', '--replacements', 'node_modules/web-vcore/node_modules/', 'node_modules/', '--clearAtLaunch', '--async', '--autoKill'])

	# rust
	# -----
	ENV = os.getenv("ENVIRONMENT") or "dev"
	# this is the nodejs-base dockerfile used for all subsequent rust images
	imageURL_rustBase = g["registryURL"] + '/dm-rust-base-' + ENV
	docker_build(imageURL_rustBase, '..', dockerfile='../Packages/deploy/@RustBase/Dockerfile',
		build_args={
			"env_ENV": ENV,
			"debug_vs_release": "release" if g["compileWithRelease"] else "debug",
			"debug_vs_release_flag": "--release" if g["compileWithRelease"] else "",
		},
	)

	imageURL_monitorBackend = g["registryURL"] + '/dm-monitor-backend-' + ENV
	docker_build(imageURL_monitorBackend, '..', dockerfile='../Packages/monitor-backend/Dockerfile',
		build_args={
			"RUST_BASE_URL": imageURL_rustBase,
			"env_ENV": ENV,
			"debug_vs_release": "release" if g["compileWithRelease"] else "debug",
			"debug_vs_release_flag": "--release" if g["compileWithRelease"] else "",
			"cargo_path": ("/cg_clif/dist/bin/cargo-clif" if g["compileWithCranelift"] else "cargo"),
			# todo: probably just always use dev/debug mode (there are very few users of the monitor tool, so compile speed is more important than execution speed)
			# docker doesn't seem to support string interpolation in COPY command, so do it here
			"copy_from_path": "/dm_repo/target/" + ("release" if g["compileWithRelease"] else "debug") + "/monitor-backend",
		},
	)
	imageURL_webServer = g["registryURL"] + '/dm-web-server-' + ENV
	docker_build(imageURL_webServer, '..', dockerfile='../Packages/web-server/Dockerfile',
		build_args={
			"RUST_BASE_URL": imageURL_rustBase,
			"env_ENV": ENV,
			"debug_vs_release": "release" if g["compileWithRelease"] else "debug",
			"debug_vs_release_flag": "--release" if g["compileWithRelease"] else "",
			"cargo_path": ("/cg_clif/dist/bin/cargo-clif" if g["compileWithCranelift"] else "cargo"),
			# docker doesn't seem to support string interpolation in COPY command, so do it here
			"copy_from_path": "/dm_repo/target/" + ("release" if g["compileWithRelease"] else "debug") + "/web-server",
		},
	)
	imageURL_appServer = g["registryURL"] + '/dm-app-server-' + ENV
	docker_build(imageURL_appServer, '..', dockerfile='../Packages/app-server/Dockerfile',
		build_args={
			"RUST_BASE_URL": imageURL_rustBase,
			"env_ENV": ENV,
			"debug_vs_release": "release" if g["compileWithRelease"] else "debug",
			"debug_vs_release_flag": "--release" if g["compileWithRelease"] else "",
			"cargo_path": ("/cg_clif/dist/bin/cargo-clif" if g["compileWithCranelift"] else "cargo"),
			# docker doesn't seem to support string interpolation in COPY command, so do it here
			"copy_from_path": "/dm_repo/target/" + ("release" if g["compileWithRelease"] else "debug") + "/app-server",
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

	# NEXT_k8s_resource_batch(g, [
	# 	{
	# 		"workload": 'dm-monitor-backend',
	# 		"trigger_mode": TRIGGER_MODE_MANUAL,
	# 		"port_forwards": '5230:5130' if g["REMOTE"] else '5130',
	# 		"labels": ["app"],
	# 	},
	# 	{
	# 		"workload": 'dm-web-server',
	# 		"trigger_mode": TRIGGER_MODE_MANUAL, # probably temp (can remove once client.build.prodQuick stops clearing the Dist folder prior to the new contents being available)
	# 		"port_forwards": '5200:5100' if g["REMOTE"] else '5100',
	# 		"labels": ["app"],
	# 	},
	# 	{
	# 		"workload": 'dm-app-server',
	# 		# Why manual? Because I want to avoid: type, save, [compile starts without me wanting it to], type and save again, [now I have to wait longer because the previous build is still running!]
	# 		"trigger_mode": TRIGGER_MODE_MANUAL,
	# 		"port_forwards": '5210:5110' if g["REMOTE"] else '5110',
	# 		"labels": ["app"],
	# 	},
	# 	{
	# 		"workload": 'nginx-gateway-node-port-tilt',
	# 		# Why manual? Because I want to avoid: type, save, [compile starts without me wanting it to], type and save again, [now I have to wait longer because the previous build is still running!]
	# 		"trigger_mode": TRIGGER_MODE_MANUAL,
	# 		"port_forwards": '80' if g["REMOTE"] else '8000:80',
	# 		"labels": ["app"],
	# 	},
	# ])
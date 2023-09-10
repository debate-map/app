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

def Start_Hyperknowledge(g):
	# build docker images
	# ==========

	imageURL_hkServer = g["registryURL"] + '/hk-server'
	#docker_build(imageURL_hkServer, '../../@HK/Main/docker/server', dockerfile='../../@HK/Main/docker/server/Dockerfile',
	docker_build(imageURL_hkServer, '../../@HK/Main', dockerfile='../../@HK/Main/docker/server/Dockerfile',
		build_args={
			#"postgres_host": "hk-postgres.default.svc.cluster.local:5432",
			#"postgres_host": "hk-postgres.default.svc.cluster.local",
			"postgres_host": "hk-postgres.default.svc",
			#"postgres_port": "TODO",
		},
	)
	imageURL_hkPostgres = g["registryURL"] + '/hk-postgres'
	docker_build(imageURL_hkPostgres, '../../@HK/Main/docker/postgres', dockerfile='../../@HK/Main/docker/postgres/Dockerfile',
		build_args={},
	)

	# deploy to kubernetes
	# ==========

	k8s_yaml(ReadFileWithReplacements('../Packages/hk-server/deployment.yaml', {
		"TILT_PLACEHOLDER:imageURL_hkServer": imageURL_hkServer,
	}))
	k8s_yaml(ReadFileWithReplacements('../Packages/hk-postgres/deployment.yaml', {
		"TILT_PLACEHOLDER:imageURL_hkPostgres": imageURL_hkPostgres,
	}))

	# configure resources
	# ==========

	# IMPORTANT NOTE: For those using Kaspersky Antivirus, its default settings cause websockets to the HK backend to be unstable. (its keepalive messages get blocked/disrupted)
	# To fix, change these settings under "Security -> Network settings -> Monitored ports": (not 100% sure if both changes are needed, but at least one is)
	# 1) Monitor selected network ports only -> list: deselect "Port: 5101" in list (this is the port that debate-map's webpack is served from)
	# 2) Monitor all ports for the applications from the list recommended by Kaspersky: enabled -> disabled [apparently Chrome is on this list]

	NEXT_k8s_resource_batch(g, [
		{
			"workload": 'hk-server',
			"trigger_mode": TRIGGER_MODE_MANUAL,
			"port_forwards": '5240:8000' if g["REMOTE"] else '5140:8000',
			"labels": ["hyperknowledge"],
		},
		{
			"workload": 'hk-postgres',
			"trigger_mode": TRIGGER_MODE_MANUAL,
			"port_forwards": '5241:5432' if g["REMOTE"] else '5141:5432',
			"labels": ["hyperknowledge"],
		},
	])
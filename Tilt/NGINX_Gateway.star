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

def Start_NGINXGateway(g):
	helm_resource(
		'ngf',
		'oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric',
		namespace='default',
		#flags=['--set=service.type=NodePort'],
		flags=['--set=service.create=false'],
	)
	# NEXT_k8s_resource_batch(g, [
	# 	{
	# 		"new_name": "gateway-api-other-objects", "labels": ["gateway"],
	# 		"objects": [
	# 			# todo
	# 		],
	# 	},
	# ])

	k8s_yaml('../Packages/deploy/LoadBalancer/@Attempt7/node_port_service.yaml')
	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "nginx-node-port-service-tilt", "labels": ["gateway"],
			"objects": [
				"nginx-gateway-node-port",
			]
			#"trigger_mode": TRIGGER_MODE_MANUAL,
			#"port_forwards": '80' if g["REMOTE"] else '8000:80',
		},
	])
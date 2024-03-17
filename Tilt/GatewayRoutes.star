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

def Start_GatewayRoutes(g):
	# custom routes
	# ==========

	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "app-routes", "labels": ["gateway"],
			"objects": [
				"main-gateway:gateway",
				# "route-web-server:httproute",
				"route-sws:httproute",
				"route-app-server:httproute",
				"route-monitor:httproute",
				"route-grafana:httproute",
			],
		},
	])
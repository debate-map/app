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

	route_resources = [
		"main-gateway:gateway",
		"route-web-server:httproute",
		"route-app-server:httproute",
		"route-monitor:httproute",
		"route-grafana:httproute",
		# at some point, we want routes for pyroscope, etc.; delayed till http-routes can have auth barriers (for now, using port-forwards); see:
		# 1) https://github.com/kubernetes-sigs/gateway-api/issues/1494
		# 2) https://github.com/nginxinc/nginx-gateway-fabric/blob/ee4319c931f55611ed2aa290251f720908e8f11a/docs/proposals/nginx-extensions.md#authentication
		#"route-pyroscope:httproute",
	]
	if g["REMOTE"]:
		route_resources.append("redirect-to-https:httproute")
	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "app-routes", "labels": ["gateway"],
			"objects": route_resources
		},
	])
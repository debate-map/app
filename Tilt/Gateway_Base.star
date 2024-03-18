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

def Start_Gateway_Base(g):
	#CreateNamespace(g, k8s_yaml, "gateway-system")
	#CreateNamespace(g, k8s_yaml, "nginx") # test

	# gateway api
	# ==========
	load_balancer_data = kustomize("../Packages/deploy/LoadBalancer/@Attempt7")
	load_balancer_data2 = decode_yaml_stream(load_balancer_data)
	listener_names = None
	# Look for the listeners in the gateway
	for item in load_balancer_data2:
		if item["kind"] == "Gateway":
			listener_names = [l['name'] for l in item['spec']['listeners']
				if (l['protocol'] == 'HTTPS') == g['REMOTE']]  # HTTP only if local, HTTPS only if remote
			break
	if not listener_names:
		fail("Missing Gateway")
	# Add the listeners to the HTTPRoutes
	for item in load_balancer_data2:
		if item["kind"] == "HTTPRoute":
			item['spec']['parentRefs']= [dict(name='main-gateway', namespace='default', sectionName=ln) for ln in listener_names]
	load_balancer_data = encode_yaml_stream(load_balancer_data2)
	k8s_yaml(load_balancer_data) # from: https://github.com/kubernetes-sigs/gateway-api/tree/v0.8.0/config/crd

	# test1-added
	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "gateway-api-crd-early", "labels": ["gateway"],
			"objects": [
				"gatewayclasses.gateway.networking.k8s.io:customresourcedefinition",
			],
		},
	])

	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "gateway-api-crd", "labels": ["gateway"],
			"objects": [
				#"gateway-api:namespace",
				#"gatewayclasses.gateway.networking.k8s.io:customresourcedefinition", # test1-removed
				"gateways.gateway.networking.k8s.io:customresourcedefinition",
				"httproutes.gateway.networking.k8s.io:customresourcedefinition",
				"referencegrants.gateway.networking.k8s.io:customresourcedefinition",
			],
		},
	])
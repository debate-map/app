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

	# if in local cluster, omit the redirect-to-https route (only the remote cluster uses https)
	redirect_to_https_route = [x for x in load_balancer_data2 if x["kind"] == "HTTPRoute" and x["metadata"]["name"] == "redirect-to-https"][0]
	if not g["REMOTE"]:
		load_balancer_data2.remove(redirect_to_https_route)

	# Find all of the listeners in the gateway that match the target environment (local: only http, remote: only https)
	for item in load_balancer_data2:
		if item["kind"] == "Gateway":
			listener_names = [
				l['name'] for l in item['spec']['listeners'] if (
					(not g['REMOTE'] and l['protocol'] == 'HTTP') # if local, retrieve the HTTP listeners only
					or (g['REMOTE'] and l['protocol'] == 'HTTPS') # if remote, retrieve the HTTPS listeners only
				)
			]
			break
	if not listener_names:
		fail("Missing Gateway")
	# Use the listeners retrieved above as the parent-refs for the HTTPRoutes. (other than the redirect-to-https route)
	for item in load_balancer_data2:
		if item["kind"] == "HTTPRoute" and item != redirect_to_https_route:
			item["spec"]["parentRefs"] = [dict(name="main-gateway", namespace="default", sectionName=ln) for ln in listener_names]

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
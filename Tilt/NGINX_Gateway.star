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
		flags=[
			'--set=service.create=false',
			#'--set=service.type=NodePort',
			#'--set=service.type=LoadBalancer',
			'--set=gateway=default/nginx-gateway-node-port',
			#'--set=service.externalIPs={15.204.30.179}',
		],
	)
	NEXT_k8s_resource_batch(g, [
		{"workload": "ngf", "labels": ["gateway"]},
		{"workload": "gateway-api-admission", "labels": ["gateway"]},
		{"workload": "gateway-api-admission-server", "labels": ["gateway"]},
		{"workload": "gateway-api-admission-patch", "labels": ["gateway"]},
	])
	#k8s_resource(workload='ngf', labels=["gateway"], port_forwards='80' if g["REMOTE"] else None)

	bind_to_address = ""
	if g["REMOTE"]:
		cluster_data = decode_yaml(local("kubectl get node -A -o yaml --context %s " % (g["CONTEXT"]), quiet = True))
		for node in cluster_data['items']:
			for address in node['status']['addresses']:
				if address['type'] == "InternalIP":
					bind_to_address = address["address"]
					print("Assigning external-ip to nginx load-balancer: " + bind_to_address)

	k8s_yaml(ReadFileWithReplacements('../Packages/deploy/LoadBalancer/@Attempt7/entry_point_service.yaml', {
		"TILT_PLACEHOLDER:port": "80" if g["REMOTE"] else "5100",
		"TILT_PLACEHOLDER:externalIPs": "externalIPs" if len(bind_to_address) > 0 else "externalIPs_disabled",
		"TILT_PLACEHOLDER:bind_to_address": bind_to_address,
	}))
	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "entry-point-service-tilt", "labels": ["gateway"],
			"objects": [
				"entry-point-service",
			],
			#"trigger_mode": TRIGGER_MODE_MANUAL,
			
			# Note: This port-forward entry actually works for all of the load-balancer-exposed services in the cluster. (since they differentiate using url-prefixes now)
			# Also: We only create a port-forwards for the remote cluster, since the local cluster doesn't need it. (k8s creates one for us, due to the entry-point-service)
			# NOTE: This port-forward doesn't currently work! (config may need to be more complex since now targeting a load-balancer service)
			"port_forwards": '5200:80' if g["REMOTE"] else None,
		},
	])
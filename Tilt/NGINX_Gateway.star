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

	bind_to_address = "127.0.0.1"  # This will actually fail, but we always want a value
	cluster_data = decode_yaml(local("kubectl get node -A -o yaml --context %s " % (g["CONTEXT"])))
	for node in cluster_data['items']:
		for address in node['status']['addresses']:
			if address['type'] == "InternalIP":
				bind_to_address = address["address"]

	k8s_yaml(ReadFileWithReplacements('../Packages/deploy/LoadBalancer/@Attempt7/node_port_service.yaml', {"bind_to_address": bind_to_address}))
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
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
			#'--version=1.1.0',
			'--version=0.0.0-edge', # needed to support gateway-api's URLRewrite filter
			'--set=service.create=false',
			#'--set=service.type=NodePort',
			#'--set=service.type=LoadBalancer',
			#'--set=gateway=default/entry-point-service',
			#'--set=nginxGateway.gatewayControllerName=gateway.nginx.org/main-gateway',
			#'--set=gateway-name=gateway.nginx.org/main-gateway',
			#'--set=service.externalIPs={15.204.30.179}',

			# attempted fix for NGF pod and deployment (and probably the gateway-class) being removed for some reason
			'--set=nginxGateway.image.pullPolicy=IfNotPresent',
			'--set=nginx.image.pullPolicy=IfNotPresent',
		],
	)
	# NEXT_k8s_resource_batch(g, [
	# 	{"workload": "gateway-api-admission", "labels": ["gateway"]},
	# 	{"workload": "gateway-api-admission-server", "labels": ["gateway"]},
	# 	{"workload": "gateway-api-admission-patch", "labels": ["gateway"]},
	# ])
	NEXT_k8s_resource_batch(g, [{"workload": "ngf", "labels": ["gateway"]}])

	bind_to_address = None
	cluster_data = decode_yaml(local("kubectl get node -A -o yaml --context %s " % (g["CONTEXT"]), quiet = True))
	for node in cluster_data['items']:
		for k, v in node.get('metadata', {}).get('annotations', {}).items():
			if k in ('flannel.alpha.coreos.com/public-ip', 'alpha.kubernetes.io/provided-node-ip'):
				bind_to_address = v
				print("Assigning external-ip to nginx load-balancer: " + bind_to_address)
				break

	k8s_yaml(ReadFileWithReplacements('../Packages/deploy/LoadBalancer/@Attempt7/entry_point_service.yaml', {
		# The below is a comparison between using type:NodePort and type:LoadBalancer. (since both have been confirmed to work both locally and in OVH)
		# Advantages of NodePort:
		# 1) Slightly simpler mechanics.
		# 2) Ensures than an (unneeded) external load-balancer resource isn't provisioned by the cloud-provider. (although OVH *seems* to avoid this, when an external-ip is provided)
		# Advantages of LoadBalancer:
		# 1) Works for a dev's local k8s cluster. (without needing to create a port-forward)
		# 2) Matches with the type of service that (normally) would get created by nginx-gateway-fabric.
		# For now, we've chosen to go with "type:LoadBalancer" for local, and "type:NodePort" for remote.
		"TILT_PLACEHOLDER:service_type": "NodePort" if g["REMOTE"] else "LoadBalancer",
		"TILT_PLACEHOLDER:http_port": "80" if g["REMOTE"] else "5100",
		"TILT_PLACEHOLDER:https_port": "443" if g["REMOTE"] else "5443", # just placeholder
		"TILT_PLACEHOLDER:externalIPs": "externalIPs" if bind_to_address else "externalIPs_disabled",
		"TILT_PLACEHOLDER:bind_to_address": bind_to_address or '',
	}))
	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "entry-point-service-tilt", "labels": ["gateway"],
			"objects": [
				"ngf-nginx-gateway-fabric",
			],
			#"trigger_mode": TRIGGER_MODE_MANUAL,

			# Note: This port-forward entry actually works for all of the load-balancer-exposed services in the cluster. (since they differentiate using url-prefixes now)
			# Also: We only create a port-forwards for the remote cluster, since the local cluster doesn't need it. (k8s creates one for us, due to the entry-point-service)
			# NOTE: This port-forward doesn't currently work! (config may need to be more complex since now targeting a load-balancer service)
			"port_forwards": '5200:80' if g["REMOTE"] else None,
		},
	])
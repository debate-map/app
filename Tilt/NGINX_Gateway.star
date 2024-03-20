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
	helm_remote(
		chart='nginx-gateway-fabric',
		repo_name='oci://ghcr.io/nginxinc/charts',
		release_name='ngf', # affects naming of pods and such; be consistent with helm_resource below
		#version='1.1.0',
		version='0.0.0-edge',
		set=[
			"service.create=false",
			#"service.type=NodePort",
			#"service.type=LoadBalancer",
			#"service.externalIPs={15.204.30.179}",
		],
	)
	NEXT_k8s_resource_batch(g, [
		{
			"workload": "ngf-nginx-gateway-fabric", "new_name": "ngf", "labels": ["gateway"],
			#"new_name": "ngf", "labels": ["gateway"],
			"objects": [
				"nginxgateways.gateway.nginx.org:customresourcedefinition",
				"nginx:gatewayclass",
				"ngf-nginx-gateway-fabric:serviceaccount",
				"ngf-nginx-gateway-fabric:clusterrole",
				"ngf-nginx-gateway-fabric:clusterrolebinding",
				"ngf-config:nginxgateway",
			]
		},
	])

	# avoiding helm_resource for now, until helm_resource unreliability is resolved: https://github.com/debate-map/app/issues/281
	# helm_resource(
	# 	chart='oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric',
	# 	release_name='ngf', # affects naming of pods and such; be consistent with helm_remote above
	# 	name='ngf', # tilt resource name
	
	# 	namespace='default',
	# 	flags=[
	# 		#'--version=1.1.0',
	# 		'--version=0.0.0-edge', # needed to support gateway-api's URLRewrite filter
	# 		'--set=service.create=false',
	# 		#'--set=service.type=NodePort',
	# 		#'--set=service.type=LoadBalancer',
	# 		#'--set=service.externalIPs={15.204.30.179}',
	
	# 		# attempted fix for NGF pod and deployment (and probably the gateway-class) being removed for some reason
	# 		'--set=nginxGateway.image.pullPolicy=IfNotPresent',
	# 		'--set=nginx.image.pullPolicy=IfNotPresent',
	# 	],
	# )
	# NEXT_k8s_resource_batch(g, [{"workload": "ngf", "labels": ["gateway"]}])

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
	# this must be commented when using "helm_remote" approach above (the "workload":"ngf-nginx-gateway-fabric" part grabs deployment by that name AND the service -- which is what the below references)
	# NEXT_k8s_resource_batch(g, [
	# 	{
	# 		"new_name": "entry-point-service-tilt", "labels": ["gateway"],
	# 		"objects": [
	# 			"ngf-nginx-gateway-fabric:service",
	# 		],
	# 		#"trigger_mode": TRIGGER_MODE_MANUAL,

	# 		# Note: This port-forward entry actually works for all of the load-balancer-exposed services in the cluster. (since they differentiate using url-prefixes now)
	# 		# Also: We only create a port-forwards for the remote cluster, since the local cluster doesn't need it. (k8s creates one for us, due to the entry-point-service)
	# 		# NOTE: This port-forward doesn't currently work! (config may need to be more complex since now targeting a load-balancer service)
	# 		"port_forwards": '5200:80' if g["REMOTE"] else None,
	# 	},
	# ])
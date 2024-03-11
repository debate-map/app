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
	# helm_remote('nginx-gateway-fabric',
	# 	#repo_url='oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric',
	# 	#repo_url='https://charts.jetstack.io',
	# 	repo_url='https://charts.helm.sh/stable',
	# 	version='1.1.0', # helm-chart version can be different from package version
	# 	#values=["../Packages/deploy/LoadBalancer/@Attempt7/@Helm/nginx-values.yaml"],
	# )
	
	#helm_repo('nginxinc', 'https://helm.nginx.com/stable')
	#helm_repo('jetstack', 'https://charts.jetstack.io')
	#helm_repo('nginxinc', 'oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric')
	helm_resource(
		'ngf',
		'oci://ghcr.io/nginxinc/charts/nginx-gateway-fabric',
		#namespace='default'
	)
	# todo
	#NEXT_k8s_resource(g, "node-setup", pod_readiness='ignore')

	k8s_yaml('../Packages/deploy/LoadBalancer/@Attempt7/node_port_service.yaml')
	# todo
	#NEXT_k8s_resource(g, "node-setup", pod_readiness='ignore')
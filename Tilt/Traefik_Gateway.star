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

# this unfortunately is a separate instance from that in root Tiltfile; might be okay in some cases
#g = {"appliedResourceNames_batches": []}

def Start_TraefikGateway(g):
	helm_remote('traefik',
		#repo_url='https://helm.traefik.io/traefik', # this repo was old/outdated! (apparently; v24.0.0 of helm-chart somehow had older contents; I guess it used a different versioning system)
		repo_url='https://traefik.github.io/charts',
		#version='10.24.0', # helm-chart version is different from traefik version
		version='24.0.0', # helm-chart version is different from traefik version
		#version='20.8.0', # helm-chart version is different from traefik version
		#version='20.7.0', # helm-chart version is different from traefik version
		# set=[
		# 	"additionalArguments={--experimental.kubernetesgateway=true,--providers.kubernetesgateway=true}",
		# 	# maybe temp (from: https://www.jetstack.io/blog/cert-manager-gateway-api-traefik-guide)
		# 	# "additionalArguments={--experimental.kubernetesgateway=true,--providers.kubernetesgateway=true,--providers.kubernetesingress,--providers.kubernetesingress.ingressendpoint.publishedservice=traefik/traefik}",
		# 	#"additionalArguments={--experimental.kubernetesgateway=true,--providers.kubernetesgateway=true,--entrypoints.web.address=:80/tcp}",
		# 	# "ssl.enforced=true",
		# 	# "dashboard.ingressRoute=true",
		# 	"ports.web.port=80",
		# ],
		values=["../Packages/deploy/LoadBalancer/@Attempt7/@Helm/traefik-values.yaml"],
	)

	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "traefik-other-objects", "labels": ["traefik"],
			"objects": [
				# "traefik:Deployment:default",
				# "traefik:Service:default",
				# "traefik:ServiceAccount:default",
				# "traefik:ClusterRole:default",
				# "traefik:ClusterRoleBinding:default",
				
				"ingressroutes.traefik.containo.us:CustomResourceDefinition:default",
				"ingressroutetcps.traefik.containo.us:CustomResourceDefinition:default",
				"ingressrouteudps.traefik.containo.us:CustomResourceDefinition:default",
				"middlewares.traefik.containo.us:CustomResourceDefinition:default",
				"middlewaretcps.traefik.containo.us:CustomResourceDefinition:default",
				"serverstransports.traefik.containo.us:CustomResourceDefinition:default",
				"tlsoptions.traefik.containo.us:CustomResourceDefinition:default",
				"tlsstores.traefik.containo.us:CustomResourceDefinition:default",
				#"traefikservices.traefik.containo.us:CustomResourceDefinition:default", # commented during traefik update: 20.8.0 -> 24.0.0
				"traefik:ServiceAccount:default",
				"traefik-dashboard:IngressRoute:default",
				# gone from update
				# "traefik:ClusterRole:default",
				# "traefik:ClusterRoleBinding:default",
				# new from update
				"traefik-default:clusterrole",
				"traefik-default:clusterrolebinding",
				"traefik:ingressclass",
			],
		},
	])

	# initialize traefik after the cluster-roles and such are initialized
	NEXT_k8s_resource_batch(g, [
		{"workload": "traefik", "labels": ["traefik"]},
	])

	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "gateway-api-crd-traefik", "labels": ["traefik"],
			"objects": [
				# added during update of gateway-api crds from 0.7.0 to 0.8.0 (completion of it)
				"traefikservices.traefik.containo.us:customresourcedefinition",
				"ingressroutes.traefik.io:customresourcedefinition",
				"ingressroutetcps.traefik.io:customresourcedefinition",
				"ingressrouteudps.traefik.io:customresourcedefinition",
				"middlewares.traefik.io:customresourcedefinition",
				"middlewaretcps.traefik.io:customresourcedefinition",
				"serverstransports.traefik.io:customresourcedefinition",
				"serverstransporttcps.traefik.io:customresourcedefinition",
				"tlsoptions.traefik.io:customresourcedefinition",
				"tlsstores.traefik.io:customresourcedefinition",
				"traefikservices.traefik.io:customresourcedefinition",
				"tcproutes.gateway.networking.k8s.io:customresourcedefinition",
				"tlsroutes.gateway.networking.k8s.io:customresourcedefinition",
			],
		},
	])
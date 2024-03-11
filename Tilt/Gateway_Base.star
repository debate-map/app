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
	# NOTE: This apparently has to be added *before* traefik, else "traefik-other-objects" batch gets error:
	# * Build Failed: kubernetes apply: error mapping traefik.io/IngressRoute: no matches for kind "IngressRoute" in version "traefik.io/v1alpha1"
	# ==========

	k8s_yaml(kustomize("../Packages/deploy/LoadBalancer/@Attempt7")) # from: https://github.com/kubernetes-sigs/gateway-api/tree/v0.8.0/config/crd
	#k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt7/gateway-webhooks/admission_webhook.yaml") # from: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v0.4.3/deploy/admission_webhook.yaml
	#k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt7/gateway-webhooks/certificate_config.yaml") # from: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v0.4.3/deploy/certificate_config.yaml

	# NEXT_k8s_resource_batch(g, [
	# 	# relating to admission-webhook system
	# 	{"workload": "gateway-api-admission-server", "labels": ["gateway"]},
	# 	{
	# 		"workload": "gateway-api-admission", "labels": ["gateway"],
	# 		"objects": [
	# 			"gateway-api-admission:serviceaccount",
	# 			"gateway-api-admission:role",
	# 			"gateway-api-admission:clusterrole",
	# 			"gateway-api-admission:rolebinding",
	# 			"gateway-api-admission:clusterrolebinding",
	# 			"gateway-api-admission:validatingwebhookconfiguration",
	# 		]
	# 	},
	# 	{"workload": "gateway-api-admission-patch", "labels": ["gateway"]},
	# ])

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

				# these objects commented during update of gateway-api crds from 0.4.3 to 0.7.0
				# "referencepolicies.gateway.networking.k8s.io:customresourcedefinition",
				# "tcproutes.gateway.networking.k8s.io:customresourcedefinition",
				# "tlsroutes.gateway.networking.k8s.io:customresourcedefinition",
				# "udproutes.gateway.networking.k8s.io:customresourcedefinition",
			],
		},
	])

	# NEXT_k8s_resource_batch(g, [
	# 	{
	# 		"new_name": "gateway-api-other-objects", "labels": ["gateway"],
	# 		"objects": [
	# 			"nginx:gatewayclass",

	# 			# "gateway-role:clusterrole",
	# 			# "gateway-controller:clusterrolebinding",
	# 		],
	# 	},
	# ])

	# custom routes
	# ==========

	NEXT_k8s_resource_batch(g, [
		{
			"new_name": "app-routes", "labels": ["gateway"],
			"objects": [
				"gateway-http:gateway",
				
				# relating to certificate-provisioning
				"gateway-https:gateway",
				
				"route-web-server:httproute",
				"route-app-server:httproute",
				"route-monitor:httproute",
				"route-grafana:httproute",
			],
		},
	])
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

def Start_Kyverno(g):
	CreateNamespace(g, k8s_yaml, "kyverno")

	# kyverno
	# ==========

	helm_remote('kyverno',
		repo_url='https://kyverno.github.io/kyverno',
		version='3.0.1', # helm-chart version is different from software version (for chart 3.0.1, software version is: v1.10.0)
	)

	# policies
	# ==========

	k8s_yaml("../Packages/deploy/Kyverno/ProtectCertManagerServices.yaml")

	# NEXT_k8s_resource_batch(g, [
	# 	{"workload": "gateway-api-admission-server", "labels": ["traefik"]},
	# 	{
	# 		"workload": "gateway-api-admission", "labels": ["traefik"],
	# 		"objects": [
	# 			"gateway-api-admission:serviceaccount",
	# 			"gateway-api-admission:role",
	# 			"gateway-api-admission:clusterrole",
	# 			"gateway-api-admission:rolebinding",
	# 			"gateway-api-admission:clusterrolebinding",
	# 			"gateway-api-admission:validatingwebhookconfiguration",
	# 		]
	# 	},
	# ])
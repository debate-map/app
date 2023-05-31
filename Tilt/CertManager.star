# imports
# ==========

# other tilt extensions
load('ext://helm_remote', 'helm_remote')
load('ext://helm_resource', 'helm_resource', 'helm_repo')
# custom tilt files
load('./Utils.star', 'ReplaceInBlob', 'ReadFileWithReplacements', 'ModifyLineRange', 'Base64Encode', 'GetDateTime')
load('./K8sUtils.star', 'NEXT_k8s_resource', 'GetLastResourceNamesBatch', 'AddResourceNamesBatch_IfValid', 'NEXT_k8s_resource_batch', 'k8s_yaml_grouped', 'CreateNamespace', 'CreateNamespaces')

# main
# ==========

def Start_CertManager(g):
	# only install the netdata pods if we're in remote cluster (it has nothing to do in local cluster)
	if g["REMOTE"]:
		helm_remote('cert-manager',
			repo_url='https://charts.jetstack.io',
			version='1.12.1',
			namespace="cert-manager",
			create_namespace=True,
			set=[
				"installCRDs=true",
				"extraArgs={--feature-gates=ExperimentalGatewayAPISupport=true}",
			],
		)

		NEXT_k8s_resource_batch(g, [
			{"workload": "cert-manager", "labels": ["cert-manager"]},
			{"workload": "cert-manager-cainjector", "labels": ["cert-manager"]},
			{"workload": "cert-manager-webhook", "labels": ["cert-manager"]},
			{"workload": "cert-manager-startupapicheck", "labels": ["cert-manager"]},
			{
				"new_name": "cert-manager-other-objects", "labels": ["cert-manager"],
				"objects": [
					"cert-manager:Namespace:default",
					"cert-manager-cainjector:ServiceAccount:cert-manager",
					"cert-manager:ServiceAccount:cert-manager",
					"cert-manager-webhook:ServiceAccount:cert-manager",
					"cert-manager-webhook:ConfigMap:cert-manager",
					"cert-manager-cainjector:ClusterRole:cert-manager",
					"cert-manager-controller-issuers:ClusterRole:cert-manager",
					"cert-manager-controller-clusterissuers:ClusterRole:cert-manager",
					"cert-manager-controller-certificates:ClusterRole:cert-manager",
					"cert-manager-controller-orders:ClusterRole:cert-manager",
					"cert-manager-controller-challenges:ClusterRole:cert-manager",
					"cert-manager-controller-ingress-shim:ClusterRole:cert-manager",
					"cert-manager-view:ClusterRole:cert-manager",
					"cert-manager-edit:ClusterRole:cert-manager",
					"cert-manager-controller-approve\\:cert-manager-io:ClusterRole:cert-manager",
					"cert-manager-controller-certificatesigningrequests:ClusterRole:cert-manager",
					"cert-manager-webhook\\:subjectaccessreviews:ClusterRole:cert-manager",
					"cert-manager-cainjector:ClusterRoleBinding:cert-manager",
					"cert-manager-controller-issuers:ClusterRoleBinding:cert-manager",
					"cert-manager-controller-clusterissuers:ClusterRoleBinding:cert-manager",
					"cert-manager-controller-certificates:ClusterRoleBinding:cert-manager",
					"cert-manager-controller-orders:ClusterRoleBinding:cert-manager",
					"cert-manager-controller-challenges:ClusterRoleBinding:cert-manager",
					"cert-manager-controller-ingress-shim:ClusterRoleBinding:cert-manager",
					"cert-manager-controller-approve\\:cert-manager-io:ClusterRoleBinding:cert-manager",
					"cert-manager-controller-certificatesigningrequests:ClusterRoleBinding:cert-manager",
					"cert-manager-webhook\\:subjectaccessreviews:ClusterRoleBinding:cert-manager",
					"cert-manager-cainjector\\:leaderelection:Role:kube-system",
					"cert-manager\\:leaderelection:Role:kube-system",
					"cert-manager-webhook\\:dynamic-serving:Role:cert-manager",
					"cert-manager-cainjector\\:leaderelection:RoleBinding:kube-system",
					"cert-manager\\:leaderelection:RoleBinding:kube-system",
					"cert-manager-webhook\\:dynamic-serving:RoleBinding:cert-manager",
					"cert-manager-webhook:MutatingWebhookConfiguration:cert-manager",
					"cert-manager-webhook:ValidatingWebhookConfiguration:cert-manager",
					"cert-manager-startupapicheck:ServiceAccount:cert-manager",
					"cert-manager-startupapicheck\\:create-cert:Role:cert-manager",
					"cert-manager-startupapicheck\\:create-cert:RoleBinding:cert-manager",
					#"zerossl-eab:Secret:cert-manager",
				],
			},
		])

		k8s_yaml(ReadFileWithReplacements('../Packages/deploy/CertManager/cert-manager.yaml', {
			"TILT_PLACEHOLDER:eab_hmacKey": os.getenv("EAB_HMAC_KEY"),
			"TILT_PLACEHOLDER:eab_kid": os.getenv("EAB_KID"),
		}))
		# NEXT_k8s_resource_batch(g, [
		# 	{"workload": "zerossl-issuer", "labels": ["cert-manager"]},
		# ])

		NEXT_k8s_resource(g, new_name="zerossl-issuer", labels=["cert-manager"],
			objects=[
				"zerossl-eab:secret",
				"zerossl-issuer:clusterissuer",
			],
		)
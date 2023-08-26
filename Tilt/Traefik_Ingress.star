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

def Start_TraefikIngress(g):
	k8s_yaml(kustomize('../Packages/deploy/LoadBalancer/@Attempt6'))
	traefik_resourceDeps = GetLastResourceNamesBatch(g)
	k8s_resource("traefik-daemon-set",
		resource_deps=traefik_resourceDeps,
		labels=["traefik"],
	)
	k8s_resource(new_name="traefik",
		objects=[
			"traefik-ingress-controller:serviceaccount",
	   	"traefik-ingress-controller:clusterrole",
	   	"traefik-ingress-controller:clusterrolebinding",
	   	"dmvx-ingress:ingress",
		],
		resource_deps=traefik_resourceDeps,
		labels=["traefik"],
	)
	AddResourceNamesBatch_IfValid(["traefik-daemon-set", "traefik"])

	# commented till I get traefik working in general
	#k8s_yaml("../Packages/deploy/LoadBalancer/traefik-dashboard.yaml")
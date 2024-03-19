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

def Start_Reflector(g):
	# reflector
	# ==========

	# from: https://github.com/emberstack/kubernetes-reflector/releases/tag/v6.1.47
	# k8s_yaml("../Packages/deploy/Reflector/reflector.yaml")
	# k8s_yaml('../Packages/deploy/Reflector/Reflections/debate-map-pguser-admin.yaml')
	# NEXT_k8s_resource(g, "reflector",
	# 	objects=[
	# 		"reflector:clusterrole",
	# 		"reflector:clusterrolebinding",
	# 		"reflector:serviceaccount",
	# 	],
	# )

	# helm_remote('reflector',
	# 	#repo_name='stable',
	# 	#repo_url='https://charts.helm.sh/stable',
	# 	repo_url='https://emberstack.github.io/helm-charts',
	# 	#version='5.4.17',
	# 	version='6.1.47',
	# )
	# NEXT_k8s_resource(g, "reflector",
	# 	objects=[
	# 		"reflector:clusterrole",
	# 		"reflector:clusterrolebinding",
	# 		"reflector:serviceaccount",
	# 	],
	# )

	helm_repo('emberstack', 'https://emberstack.github.io/helm-charts')
	helm_resource(
		'reflector',
		'emberstack/reflector',
		'--set=version=7.1.262',
		#labels=['reflector'],
		#resource_deps=['helm-repo-bitnami'],
		resource_deps=['pgo_late'], # this maybe fixes the errors we were hitting in postgres-operator pods, from reflector's code?
	)
	k8s_yaml(ReadFileWithReplacements('../Packages/deploy/Reflector/Reflections/debate-map-pguser-admin.yaml', {
		#"TILT_PLACEHOLDER:currentTime": timeOfThisTiltfileUpdate,
		# only update this each time the "tilt up" command is started, not each iteration (switch back to using "timeOfThisTiltfileUpdate" if situation still problematic for new devs)
		"TILT_PLACEHOLDER:currentTime": g["timeOfTiltUpCommand"],
	}))
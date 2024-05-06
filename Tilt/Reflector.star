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

	helm_remote('reflector',
		repo_url='https://emberstack.github.io/helm-charts',
		version='7.1.262',
	)
	NEXT_k8s_resource(g, "reflector",
		objects=[
			"reflector:clusterrole",
			"reflector:clusterrolebinding",
			"reflector:serviceaccount",
		],
	)

	# avoiding helm_resource for now, until helm_resource unreliability is resolved: https://github.com/debate-map/app/issues/281
	# helm_repo('emberstack', 'https://emberstack.github.io/helm-charts')
	# helm_resource(
	# 	'reflector',
	# 	'emberstack/reflector',
	# 	#labels=['reflector'],
	# 	flags=['--set=version=7.1.262'],
	# 	resource_deps=[
	# 		'emberstack',
	# 		'pgo_late', # this maybe fixes the errors we were hitting in postgres-operator pods, from reflector's code?
	# 	],
	# )

	k8s_yaml(ReadFileWithReplacements('../Packages/deploy/Reflector/Reflections/debate-map-pguser-admin.yaml', {
		#"TILT_PLACEHOLDER:currentTime": timeOfThisTiltfileUpdate,
		# only update this each time the "tilt up" command is started, not each iteration (switch back to using "timeOfThisTiltfileUpdate" if situation still problematic for new devs)
		"TILT_PLACEHOLDER:currentTime": g["timeOfTiltUpCommand"],
	}))

	# the individual resources that get reflected are named/initialized (using `k8s_resource`) in the other, context-specific .star files
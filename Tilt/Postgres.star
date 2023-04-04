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

def Start_Postgres(g):
	# crunchydata postgres operator
	# ==========

	CreateNamespace(g, k8s_yaml, "postgres-operator")

	#print("bucket_uniformPrivate_url:", bucket_uniformPrivate_url)

	# temp: before deploying the postgres-resources, run "docker pull X" for the large postgres images
	# ----------
	# (fix for bug in Kubernetes 1.24.2-1.25.0-? where in-container image-pulls that take longer than 2m get interrupted/timed-out: https://github.com/docker/for-mac/issues/6300#issuecomment-1324044788)
	local_resource("pre-pull-large-image-1", "docker pull registry.developers.crunchydata.com/crunchydata/crunchy-pgbackrest:ubi8-2.41-2")
	#local_resource("pre-pull-large-image-2", "docker pull registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-13.9-2")
	local_resource("pre-pull-large-image-2", "docker pull registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-15.1-0")
	#local_resource("pre-pull-large-image-2", "docker pull gcr.io/debate-map-prod/crunchy-postgres:ubi8-15.1-0")
	# ----------

	k8s_yaml(helm('../Packages/deploy/PGO/install', namespace="postgres-operator"))

	gcsMissingMessage = "[gcs-key.json was not found]"
	gcsKeyFileContents = str(read_file("../Others/Secrets/gcs-key.json", gcsMissingMessage))
	if gcsKeyFileContents == gcsMissingMessage:
		print("Warning: File \"Others/Secrets/gcs-key.json\" was not found; pgbackrest will not be enabled in this cluster. (this is normal if you're not a backend-deployer)")

	postgresYaml = str(ReplaceInBlob(helm('../Packages/deploy/PGO/postgres', namespace="postgres-operator"), {
		"TILT_PLACEHOLDER:bucket_uniformPrivate_name": g["bucket_uniformPrivate_name"],
		"[@base64]TILT_PLACEHOLDER:gcsKeyAsString": gcsKeyFileContents.replace("\n", "\n    ")
	}))
	if gcsKeyFileContents == gcsMissingMessage:
		postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK1_whenGCSOff", "TILTFILE_MANAGED_BLOCK2_whenGCSOn", action="reduceIndent")
		postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK2_whenGCSOn", "TILTFILE_MANAGED_BLOCK3", action="omit")
	else:
		postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK1_whenGCSOff", "TILTFILE_MANAGED_BLOCK2_whenGCSOn", action="omit")
		postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK2_whenGCSOn", "TILTFILE_MANAGED_BLOCK3", action="reduceIndent")

	# enableRestoreForProd = True
	# enableRestore = enableRestoreForProd if PROD else False
	if g["DEV"]:
		postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK_Restore_1ForDev", "TILTFILE_MANAGED_BLOCK_Restore_2ForProd", action="reduceIndent")
		postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK_Restore_2ForProd", "TILTFILE_MANAGED_BLOCK_Restore_3End", action="omit")
	elif g["PROD"]:
		postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK_Restore_1ForDev", "TILTFILE_MANAGED_BLOCK_Restore_2ForProd", action="omit")
		postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK_Restore_2ForProd", "TILTFILE_MANAGED_BLOCK_Restore_3End", action="reduceIndent")

	k8s_yaml(blob(postgresYaml))

	# now package up the postgres objects into the Tilt "database" section
	# ----------

	# todo: probably move the "DO NOT RESTART" marker from the category to just the resources that need it (probably only the first one needs it)
	# List of pods that I've confirmed are fine to kill/restart:
	# * debate-map-instance1-XXX (the pod for the database itself)

	pgo_crdName = "postgresclusters.postgres-operator.crunchydata.com:customresourcedefinition"
	pgo_upgrades_crdName = "pgupgrades.postgres-operator.crunchydata.com"
	NEXT_k8s_resource(g, new_name='pgo_crd-definition', labels=["database_DO-NOT-RESTART-THESE"],
		objects=[
			#"postgres-operator:Namespace:default",
			pgo_crdName, # the CRD definition?
			pgo_upgrades_crdName,
		],
		pod_readiness='ignore',
		resource_deps_extra=[
			"pre-pull-large-image-1", "pre-pull-large-image-2",
			#"pre-pull-rust-base-image"
		]
	)

	# Wait until the CRDs are ready.
	#local_resource('pgo_crd-definition_ready', cmd='kubectl wait --for=condition=Established crd ' + pgo_crdName, resource_deps=GetLastResourceNamesBatch(), labels=["database_DO-NOT-RESTART-THESE"])
	local_resource('pgo_crd-definition_ready', labels=["database_DO-NOT-RESTART-THESE"],
		cmd="tilt wait --for=condition=Ready uiresource/pgo_crd-definition",
		resource_deps=GetLastResourceNamesBatch(g),
	)
	AddResourceNamesBatch_IfValid(g, ["pgo_crd-definition_ready"])

	# NEXT_k8s_resource(new_name='pgo_crd-instance',
	# 	objects=[
	# 		"debate-map:postgrescluster", # the CRD instance?
	# 	],
	# 	labels=["database_DO-NOT-RESTART-THESE"],
	# )
	NEXT_k8s_resource(g, 'pgo', labels=["database_DO-NOT-RESTART-THESE"],
		objects=[
			#"debate-map:postgrescluster", # the CRD instance?
			#"postgres-operator:clusterrole",
			#"postgres-operator:clusterrolebinding",
			"pgo:serviceaccount",
			"pgo:clusterrole",
			"pgo:clusterrolebinding",
			"debate-map-pguser-admin:secret",
			#"pgo-gcs-creds:secret",
			"debate-map-pgbackrest-secret:secret",
			"debate-map:postgrescluster",
		],
	)
	NEXT_k8s_resource(g, 'pgo-upgrade', labels=["database_DO-NOT-RESTART-THESE"],
		objects=[
			"pgo-upgrade:serviceaccount",
			"pgo-upgrade:clusterrole",
       	"pgo-upgrade:clusterrolebinding",
		],
	)
	# this is in separate group, so pod_readiness="ignore" only applies to it
	NEXT_k8s_resource(g, new_name='pgo_late', labels=["database_DO-NOT-RESTART-THESE"],
		#objects=["pgo-gcs-creds:secret"],
		objects=["empty1"],
		pod_readiness='ignore',
		extra_pod_selectors={
			"postgres-operator.crunchydata.com/cluster": "debate-map",
			"postgres-operator.crunchydata.com/role": "master"
		},
		port_forwards='5220:5432' if g["REMOTE"] else '5120:5432',
	)

	# crunchydata prometheus
	# ==========

	# k8s_yaml(kustomize('../Packages/deploy/Monitors/pg-monitor-pack'))
	# # nothing depends on these pods, so don't wait for them to be "ready"
	# NEXT_k8s_resource("crunchy-prometheus", pod_readiness='ignore', labels=["monitoring"])
	# NEXT_k8s_resource("crunchy-alertmanager", pod_readiness='ignore', labels=["monitoring"])
	# NEXT_k8s_resource("crunchy-grafana", pod_readiness='ignore', labels=["monitoring"],
	# 	port_forwards='4405:3000' if g["REMOTE"] else '3405:3000',
	# )
	# NEXT_k8s_resource(new_name="crunchy-others", labels=["monitoring"],
	# 	pod_readiness='ignore',
	# 	objects=[
	# 		"alertmanager:serviceaccount",
	# 		"grafana:serviceaccount",
	# 		"prometheus-sa:serviceaccount",
	# 		"prometheus-cr:clusterrole",
	# 		"prometheus-crb:clusterrolebinding",
	# 		"alertmanagerdata:persistentvolumeclaim",
	# 		"grafanadata:persistentvolumeclaim",
	# 		"prometheusdata:persistentvolumeclaim",
	# 		"alertmanager-config:configmap",
	# 		"alertmanager-rules-config:configmap",
	# 		"crunchy-prometheus:configmap",
	# 		"grafana-dashboards:configmap",
	# 		"grafana-datasources:configmap",
	# 		"grafana-secret:secret",
	# 	])
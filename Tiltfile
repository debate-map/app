# allow using tilt to also push to the remote OVHcloud k8s cluster
allow_k8s_contexts('ovh')

#print("Env vars:", os.environ)
load('ext://dotenv', 'dotenv')
dotenv()
#print("Env vars after loading from .env file:", os.environ)

ENV = os.getenv("ENV")
DEV = ENV == "dev"
PROD = ENV == "prod"
print("Env:", ENV)

CONTEXT = os.getenv("CONTEXT")
REMOTE = CONTEXT != "local"
print("Context:", CONTEXT, "Remote:", REMOTE)

# tilt config settings
# For now, we just completely disable tilt's docker-prune behavior (doing so fixes issue #169); there might be a better solution, but this is fine for now.
# To keep tilt's image-generation from taking up too much space, you can manually do docker-prunes when docker's image-storage grows too large, eg:
# 1) Prune all: `docker builder prune`
# 2) Prune build-cache (largest single layer, but also useful to keep): `docker builder prune --filter type=exec.cachemount`
# 3) Prune non-build-cache (recommended; though should be modified to exclude rust-base image; also not yet tested): `docker builder prune --filter type!=exec.cachemount`
docker_prune_settings(disable=True)

# Trying with docker-prune enabled, but with no max-age -- relying only on `keep_recent` count. (to be seen if this preserves what's needed for fast recompiles)
# [Update: Didn't work; still cleared basically all build-cache, from 185gb to <1gb, when should have left at least ~4.5gb for cargo build-cache.]
# For reference, here is the source-code of tilt's docker-prune function: https://github.com/tilt-dev/tilt/blob/4c8b561077f95316fe2a2a3ee27db8b0edba057d/internal/engine/dockerprune/docker_pruner.go#L137
#docker_prune_settings(max_age_mins = 999888777666555, keep_recent = 2)

# other tilt extensions
load('ext://helm_remote', 'helm_remote')
load('ext://helm_resource', 'helm_resource', 'helm_repo')

# custom tilt files
load('./Scripts/Tiltfile/Utils', 'CreateNamespace', 'ReplaceInBlob', 'ReadFileWithReplacements', 'ModifyLineRange', 'Base64Encode', "GetDateTime")

# tacking of tiltfile runs
timeOfThisTiltfileUpdate = GetDateTime()
if os.getenv("TIME_OF_TILT_UP_COMMAND") == None:
	os.putenv("TIME_OF_TILT_UP_COMMAND", timeOfThisTiltfileUpdate)
timeOfTiltUpCommand = os.getenv("TIME_OF_TILT_UP_COMMAND")

# if this chaining system is insufficient to yield reliable/deterministic cluster-initializations, then try adding (or possibly even replacing it with): update_settings(max_parallel_updates=1)

appliedResourceNames_batches = []
def GetLastResourceNamesBatch():
	return appliedResourceNames_batches[-1] if len(appliedResourceNames_batches) > 0 else []
def AddResourceNamesBatch_IfValid(namesBatch):
	if len(namesBatch) > 0:
		appliedResourceNames_batches.append(namesBatch)

def NEXT_k8s_resource(workload = '', **args):
	entry = args
	entry["workload"] = workload
	results = NEXT_k8s_resource_batch([
		entry
	])
	return results[0]
def NEXT_k8s_resource_batch(entries = []):
	resource_deps = GetLastResourceNamesBatch()
	batch_resourceNames = []

	results = []
	for entry in entries:
		if "resource_deps" in entry:
			fail("Cannot directly specify resource_deps, for resource \"" + thisResourceName + "\", since that field is handled by NEXT_k8s_resource_batch."
				+ " (if you want to add resource_deps beyond those added by NEXT_k8s_resource_batch, use the the resource_deps_extra field, or the regular k8s_resource function)")
		entry["resource_deps"] = resource_deps[:] # copy array
		if "resource_deps_extra" in entry:
			for extra_dep in entry["resource_deps_extra"]:
				entry["resource_deps"].append(extra_dep)
			entry.pop("resource_deps_extra", None)

		thisResourceName = entry["new_name"] if "new_name" in entry else entry["workload"]
		batch_resourceNames.append(thisResourceName)

		results.append(k8s_resource(**entry))
	AddResourceNamesBatch_IfValid(batch_resourceNames)
	
	return results

def k8s_yaml_grouped(pathOrBlob, groupName, resourcesToIgnore = []):
	'''blob = read_file(pathOrBlob) else pathOrBlob
	k8s_yaml(pathOrBlob)
	objInfos = decode_yaml_stream(blob)'''
	k8s_yaml(pathOrBlob)
	objInfos = read_yaml_stream(pathOrBlob) if type(pathOrBlob) == "string" else decode_yaml_stream(pathOrBlob)

	group_finalResourceNames = []
	for objInfo in objInfos:
		#if "kind" in objInfo and objInfo["kind"] == "CustomResourceDefinition": continue
		kind = objInfo["kind"]
		if "metadata" not in objInfo: continue
		meta = objInfo["metadata"]

		#print("objInfo:" + str(objInfo))
		if "name" in meta:
			stillNeedsAdding = kind not in ["Deployment", "DaemonSet", "StatefulSet", "ReplicaSet", "Service", "Job"] # if its kind is one of these, tilt has already added the resource
			name = meta["name"]
			fullyQualifiedName = meta["name"].replace(":", "\\:") + ":" + kind.lower()
			finalResourceName = fullyQualifiedName if stillNeedsAdding else name
			ignored = finalResourceName in resourcesToIgnore
			print("Resource:" + fullyQualifiedName + (" [ignored for now]" if ignored else ""))

			# for some reason, we have to call k8s_resource here for "pixie-operator-subscription:subscription" and such, else the resource can't be found later (which we need to work so we can set its resource_deps)
			#if ignored: continue
			if not ignored:
				group_finalResourceNames.append(finalResourceName)

			k8s_resource(
				#meta["name"],
				workload="" if stillNeedsAdding else name,
				new_name=fullyQualifiedName if stillNeedsAdding else "",
				objects=[fullyQualifiedName] if stillNeedsAdding else [],
				resource_deps=GetLastResourceNamesBatch(),
				labels=[groupName]
			)

	AddResourceNamesBatch_IfValid(group_finalResourceNames)

# namespaces
# ==========

# Never manually-restart this "namespaces" group! (deletion of namespaces can get frozen, and it's a pain to manually restart)
NEXT_k8s_resource(new_name="namespaces",
	objects=[
		#"postgres-operator:Namespace:default",
		"app:namespace",
	],
)

# others (early)
# ==========

k8s_yaml('./Packages/deploy/NodeSetup/node-setup-daemon-set.yaml')
# since node-setup pod sleeps forever after running (causing readiness checks to fail/never-return... I think), don't wait for those readiness-checks to succeed
NEXT_k8s_resource("node-setup", pod_readiness='ignore')

# metrics-server (already present on OVH, but lacking in docker-desktop; added for convenience, eg. seeing memory usage of pods easily using `kubectl top`)
# ==========

if not REMOTE:
	k8s_yaml('./Packages/deploy/Monitors/metrics-server/components.yaml')
	NEXT_k8s_resource("metrics-server", labels=["monitoring"], pod_readiness='ignore')

# prometheus
# ==========

# load(
# 	'Packages/deploy/Monitors/prometheus-pack/Tiltfile',
# 	'install'
# )
# install()

# NEXT_k8s_resource("prometheus",
# 	objects=[
# 		"vfiles-configmap:configmap",
# 	],
# 	labels=["monitoring"],
# )
# NEXT_k8s_resource("grafana",
# 	objects=[
# 		"grafana-config-monitoring:configmap",
# 		"grafana-dashboards:configmap",
# 		"grafana-datasources:configmap",
# 		"grafana-dashboard-kubernetes-cluster:configmap",
# 		"grafana-dashboard-node-exporter-full:configmap",
# 	],
# 	labels=["monitoring"],
# )
# NEXT_k8s_resource("node-exporter",
# 	objects=[
# 		"node-exporter-claim0:persistentvolumeclaim",
# 		"node-exporter-claim1:persistentvolumeclaim",
# 	],
# 	labels=["monitoring"],
# )
# '''NEXT_k8s_resource("cadvisor",
# 	objects=[
# 		"cadvisor-claim0:persistentvolumeclaim",
# 		"cadvisor-claim1:persistentvolumeclaim",
# 		"cadvisor-claim2:persistentvolumeclaim",
# 	],
# )'''

# crunchydata postgres operator
# ==========

CreateNamespace(k8s_yaml, "postgres-operator")

pulumiOutput = decode_json(str(read_file("./PulumiOutput_Public.json")))
registryURL = pulumiOutput["registryURL"]
bucket_uniformPrivate_url = pulumiOutput["bucket_prod_uniformPrivate_url" if PROD else "bucket_dev_uniformPrivate_url"]
bucket_uniformPrivate_name = pulumiOutput["bucket_prod_uniformPrivate_name" if PROD else "bucket_dev_uniformPrivate_name"]
#print("bucket_uniformPrivate_url:", bucket_uniformPrivate_url)

# temp: before deploying the postgres-resources, run "docker pull X" for the large postgres images
# (fix for bug in Kubernetes 1.24.2 where in-container image-pulls that take longer than 2m get interrupted/timed-out: https://github.com/docker/for-mac/issues/6300#issuecomment-1324044788)
#local_resource("pre-pull-large-image-1", "docker pull registry.developers.crunchydata.com/crunchydata/crunchy-pgbackrest:ubi8-2.41-2")
#local_resource("pre-pull-large-image-2", "docker pull registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-15.1-0")
# update: it appears the issue is still present in Kubernetes 1.25.2 (at least in some cases), so we'll keep using this workaround for now
local_resource("pre-pull-large-image-1", "docker pull registry.developers.crunchydata.com/crunchydata/crunchy-pgbackrest:ubi8-2.41-2")
local_resource("pre-pull-large-image-2", "docker pull registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-13.9-2")

k8s_yaml(helm('./Packages/deploy/PGO/install', namespace="postgres-operator"))

gcsMissingMessage = "[gcs-key.json was not found]"
gcsKeyFileContents = str(read_file("./Others/Secrets/gcs-key.json", gcsMissingMessage))
if gcsKeyFileContents == gcsMissingMessage:
	print("Warning: File \"Others/Secrets/gcs-key.json\" was not found; pgbackrest will not be enabled in this cluster. (this is normal if you're not a backend-deployer)")

postgresYaml = str(ReplaceInBlob(helm('./Packages/deploy/PGO/postgres', namespace="postgres-operator"), {
	"TILT_PLACEHOLDER:bucket_uniformPrivate_name": bucket_uniformPrivate_name,
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
if DEV:
	postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK_Restore_1ForDev", "TILTFILE_MANAGED_BLOCK_Restore_2ForProd", action="reduceIndent")
	postgresYaml = ModifyLineRange(postgresYaml, "TILTFILE_MANAGED_BLOCK_Restore_2ForProd", "TILTFILE_MANAGED_BLOCK_Restore_3End", action="omit")
elif PROD:
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
NEXT_k8s_resource(new_name='pgo_crd-definition',
	objects=[
		#"postgres-operator:Namespace:default",
		pgo_crdName, # the CRD definition?
		pgo_upgrades_crdName,
	],
	pod_readiness='ignore',
	labels=["database_DO-NOT-RESTART-THESE"],
	resource_deps_extra=[
		"pre-pull-large-image-1", "pre-pull-large-image-2",
		#"pre-pull-rust-base-image"
	]
)

# Wait until the CRDs are ready.
#local_resource('pgo_crd-definition_ready', cmd='kubectl wait --for=condition=Established crd ' + pgo_crdName, resource_deps=GetLastResourceNamesBatch(), labels=["database_DO-NOT-RESTART-THESE"])
local_resource('pgo_crd-definition_ready',
	cmd="tilt wait --for=condition=Ready uiresource/pgo_crd-definition",
	resource_deps=GetLastResourceNamesBatch(),
	labels=["database_DO-NOT-RESTART-THESE"])
AddResourceNamesBatch_IfValid(["pgo_crd-definition_ready"])

# NEXT_k8s_resource(new_name='pgo_crd-instance',
# 	objects=[
# 		"debate-map:postgrescluster", # the CRD instance?
# 	],
# 	labels=["database_DO-NOT-RESTART-THESE"],
# )
NEXT_k8s_resource('pgo-upgrade',
	labels=["database_DO-NOT-RESTART-THESE"],
)
NEXT_k8s_resource('pgo',
	objects=[
		#"debate-map:postgrescluster", # the CRD instance?
		#"postgres-operator:clusterrole",
		#"postgres-operator:clusterrolebinding",
		"pgo:serviceaccount",
		"debate-map-pguser-admin:secret",
		#"pgo-gcs-creds:secret",
		"debate-map-pgbackrest-secret:secret",
	],
	labels=["database_DO-NOT-RESTART-THESE"],
)
# this is in separate group, so pod_readiness="ignore" only applies to it
NEXT_k8s_resource(new_name='pgo_late',
	#objects=["pgo-gcs-creds:secret"],
	objects=["empty1"],
	pod_readiness='ignore',
	extra_pod_selectors={
		"postgres-operator.crunchydata.com/cluster": "debate-map",
		"postgres-operator.crunchydata.com/role": "master"
	},
	port_forwards='5220:5432' if REMOTE else '5120:5432',
	labels=["database_DO-NOT-RESTART-THESE"],
)

# crunchydata prometheus
# ==========

# k8s_yaml(kustomize('./Packages/deploy/Monitors/pg-monitor-pack'))
# # nothing depends on these pods, so don't wait for them to be "ready"
# NEXT_k8s_resource("crunchy-prometheus", pod_readiness='ignore', labels=["monitoring"])
# NEXT_k8s_resource("crunchy-alertmanager", pod_readiness='ignore', labels=["monitoring"])
# NEXT_k8s_resource("crunchy-grafana", pod_readiness='ignore', labels=["monitoring"],
# 	port_forwards='4405:3000' if REMOTE else '3405:3000',
# )
# NEXT_k8s_resource(new_name="crunchy-others",
# 	pod_readiness='ignore',
# 	labels=["monitoring"],
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

# reflector
# ==========

# from: https://github.com/emberstack/kubernetes-reflector/releases/tag/v6.1.47
# k8s_yaml("./Packages/deploy/Reflector/reflector.yaml")
# k8s_yaml('./Packages/deploy/Reflector/Reflections/debate-map-pguser-admin.yaml')
# NEXT_k8s_resource("reflector",
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
# NEXT_k8s_resource("reflector",
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
  #labels=['reflector'],
  #resource_deps=['helm-repo-bitnami']
  resource_deps=['pgo_late'] # this maybe fixes the errors we were hitting in postgres-operator pods, from reflector's code?
)
k8s_yaml(ReadFileWithReplacements('./Packages/deploy/Reflector/Reflections/debate-map-pguser-admin.yaml', {
	#"TILT_PLACEHOLDER:currentTime": timeOfThisTiltfileUpdate,
	# only update this each time the "tilt up" command is started, not each iteration (switch back to using "timeOfThisTiltfileUpdate" if situation still problematic for new devs)
	"TILT_PLACEHOLDER:currentTime": timeOfTiltUpCommand,
}))

# load-balancer/reverse-proxy (traefik, ingress-based [old])
# ==========

k8s_yaml(kustomize('./Packages/deploy/LoadBalancer/@Attempt6'))
traefik_resourceDeps = GetLastResourceNamesBatch()
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
#k8s_yaml("Packages/deploy/LoadBalancer/traefik-dashboard.yaml")

# load-balancer/reverse-proxy (traefik, gateway-based [new])
# ==========

# k8s_yaml(kustomize("./Packages/deploy/LoadBalancer/@Attempt7")) # from: https://github.com/kubernetes-sigs/gateway-api/tree/v0.4.3/config/crd
# #k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt7/gateway-webhooks/admission_webhook.yaml") # from: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v0.4.3/deploy/admission_webhook.yaml
# #k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt7/gateway-webhooks/certificate_config.yaml") # from: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v0.4.3/deploy/certificate_config.yaml

# NEXT_k8s_resource_batch([
# 	{"workload": "gateway-api-admission-server", "labels": ["gateway-api"]},
# 	{"workload": "gateway-api-admission", "labels": ["gateway-api"]},
# 	{"workload": "gateway-api-admission-patch", "labels": ["gateway-api"]},
# 	{
# 		"new_name": "gateway-api-other-objects", "labels": ["gateway-api"],
# 		"objects": [
# 			"gateway-api:namespace",
#    		"gatewayclasses.gateway.networking.k8s.io:customresourcedefinition",
#    		"gateways.gateway.networking.k8s.io:customresourcedefinition",
#    		"httproutes.gateway.networking.k8s.io:customresourcedefinition",
#    		"referencepolicies.gateway.networking.k8s.io:customresourcedefinition",
#    		"tcproutes.gateway.networking.k8s.io:customresourcedefinition",
#    		"tlsroutes.gateway.networking.k8s.io:customresourcedefinition",
#    		"udproutes.gateway.networking.k8s.io:customresourcedefinition",
#    		"gateway-api-admission:serviceaccount",
#    		"gateway-api-admission:role",
#    		"gateway-api-admission:clusterrole",
#    		"gateway-api-admission:rolebinding",
#    		"gateway-api-admission:clusterrolebinding",
#    		"gateway-http:gateway",
#    		#"gateway-https:gateway",
#    		"gateway-api-admission:validatingwebhookconfiguration",
#    		# "route-web-server:httproute",
#    		# "route-app-server:httproute",
#    		# "route-monitor:httproute",
# 		],
# 	},
# ])

# helm_remote('traefik',
# 	repo_url='https://helm.traefik.io/traefik',
# 	version='10.24.0', # helm-chart version is different from traefik version
# 	# set=[
# 	# 	"additionalArguments={--experimental.kubernetesgateway=true,--providers.kubernetesgateway=true}",
# 	# 	# maybe temp (from: https://www.jetstack.io/blog/cert-manager-gateway-api-traefik-guide)
# 	# 	# "additionalArguments={--experimental.kubernetesgateway=true,--providers.kubernetesgateway=true,--providers.kubernetesingress,--providers.kubernetesingress.ingressendpoint.publishedservice=traefik/traefik}",
# 	# 	#"additionalArguments={--experimental.kubernetesgateway=true,--providers.kubernetesgateway=true,--entrypoints.web.address=:80/tcp}",
# 	# 	# "ssl.enforced=true",
# 	# 	# "dashboard.ingressRoute=true",
# 	# 	"ports.web.port=80",
# 	# ],
# 	values=["./Packages/deploy/LoadBalancer/@Attempt7/@Helm/traefik-values.yaml"],
# )

# NEXT_k8s_resource_batch([
# 	{
# 		"new_name": "traefik-other-objects", "labels": ["traefik"],
# 		"objects": [
# 			# "traefik:Deployment:default",
# 			# "traefik:Service:default",
# 			# "traefik:ServiceAccount:default",
# 			# "traefik:ClusterRole:default",
# 			# "traefik:ClusterRoleBinding:default",
# 			"ingressroutes.traefik.containo.us:CustomResourceDefinition:default",
# 			"ingressroutetcps.traefik.containo.us:CustomResourceDefinition:default",
# 			"ingressrouteudps.traefik.containo.us:CustomResourceDefinition:default",
# 			"middlewares.traefik.containo.us:CustomResourceDefinition:default",
# 			"middlewaretcps.traefik.containo.us:CustomResourceDefinition:default",
# 			"serverstransports.traefik.containo.us:CustomResourceDefinition:default",
# 			"tlsoptions.traefik.containo.us:CustomResourceDefinition:default",
# 			"tlsstores.traefik.containo.us:CustomResourceDefinition:default",
# 			"traefikservices.traefik.containo.us:CustomResourceDefinition:default",
# 			"traefik:ServiceAccount:default",
# 			"traefik:ClusterRole:default",
# 			"traefik:ClusterRoleBinding:default",
# 			"traefik-dashboard:IngressRoute:default",
# 		],
# 	},
# ])

# # initialize traefik after the cluster-roles and such are initialized
# NEXT_k8s_resource_batch([
# 	{"workload": "traefik", "labels": ["traefik"]},
# ])

# # cert-manager (for creating/renewing SSL certificates)
# # ==========

# # only install the netdata pods if we're in remote cluster (it has nothing to do in local cluster)
# if REMOTE:
# 	helm_remote('cert-manager',
# 		repo_url='https://charts.jetstack.io',
# 		version='1.8.2',
# 		namespace="cert-manager",
# 		create_namespace=True,
# 		set=[
# 			"installCRDs=true",
# 			"extraArgs={--feature-gates=ExperimentalGatewayAPISupport=true}",
# 		],
# 	)

# 	NEXT_k8s_resource_batch([
# 		{"workload": "cert-manager", "labels": ["cert-manager"]},
# 		{"workload": "cert-manager-cainjector", "labels": ["cert-manager"]},
# 		{"workload": "cert-manager-webhook", "labels": ["cert-manager"]},
# 		{"workload": "cert-manager-startupapicheck", "labels": ["cert-manager"]},
# 		{
# 			"new_name": "cert-manager-other-objects", "labels": ["cert-manager"],
# 			"objects": [
# 				"cert-manager:Namespace:default",
# 				"cert-manager-cainjector:ServiceAccount:cert-manager",
# 				"cert-manager:ServiceAccount:cert-manager",
# 				"cert-manager-webhook:ServiceAccount:cert-manager",
# 				"cert-manager-webhook:ConfigMap:cert-manager",
# 				"cert-manager-cainjector:ClusterRole:cert-manager",
# 				"cert-manager-controller-issuers:ClusterRole:cert-manager",
# 				"cert-manager-controller-clusterissuers:ClusterRole:cert-manager",
# 				"cert-manager-controller-certificates:ClusterRole:cert-manager",
# 				"cert-manager-controller-orders:ClusterRole:cert-manager",
# 				"cert-manager-controller-challenges:ClusterRole:cert-manager",
# 				"cert-manager-controller-ingress-shim:ClusterRole:cert-manager",
# 				"cert-manager-view:ClusterRole:cert-manager",
# 				"cert-manager-edit:ClusterRole:cert-manager",
# 				"cert-manager-controller-approve\\:cert-manager-io:ClusterRole:cert-manager",
# 				"cert-manager-controller-certificatesigningrequests:ClusterRole:cert-manager",
# 				"cert-manager-webhook\\:subjectaccessreviews:ClusterRole:cert-manager",
# 				"cert-manager-cainjector:ClusterRoleBinding:cert-manager",
# 				"cert-manager-controller-issuers:ClusterRoleBinding:cert-manager",
# 				"cert-manager-controller-clusterissuers:ClusterRoleBinding:cert-manager",
# 				"cert-manager-controller-certificates:ClusterRoleBinding:cert-manager",
# 				"cert-manager-controller-orders:ClusterRoleBinding:cert-manager",
# 				"cert-manager-controller-challenges:ClusterRoleBinding:cert-manager",
# 				"cert-manager-controller-ingress-shim:ClusterRoleBinding:cert-manager",
# 				"cert-manager-controller-approve\\:cert-manager-io:ClusterRoleBinding:cert-manager",
# 				"cert-manager-controller-certificatesigningrequests:ClusterRoleBinding:cert-manager",
# 				"cert-manager-webhook\\:subjectaccessreviews:ClusterRoleBinding:cert-manager",
# 				"cert-manager-cainjector\\:leaderelection:Role:kube-system",
# 				"cert-manager\\:leaderelection:Role:kube-system",
# 				"cert-manager-webhook\\:dynamic-serving:Role:cert-manager",
# 				"cert-manager-cainjector\\:leaderelection:RoleBinding:kube-system",
# 				"cert-manager\\:leaderelection:RoleBinding:kube-system",
# 				"cert-manager-webhook\\:dynamic-serving:RoleBinding:cert-manager",
# 				"cert-manager-webhook:MutatingWebhookConfiguration:cert-manager",
# 				"cert-manager-webhook:ValidatingWebhookConfiguration:cert-manager",
# 				"cert-manager-startupapicheck:ServiceAccount:cert-manager",
# 				"cert-manager-startupapicheck\\:create-cert:Role:cert-manager",
# 				"cert-manager-startupapicheck\\:create-cert:RoleBinding:cert-manager",
# 				#"zerossl-eab:Secret:cert-manager",
# 			],
# 		},
# 	])

# 	k8s_yaml(ReadFileWithReplacements('./Packages/deploy/CertManager/cert-manager.yaml', {
# 		"TILT_PLACEHOLDER:eab_hmacKey": os.getenv("EAB_HMAC_KEY"),
# 		"TILT_PLACEHOLDER:eab_kid": os.getenv("EAB_KID"),
# 	}))
# 	# NEXT_k8s_resource_batch([
# 	# 	{"workload": "zerossl-issuer", "labels": ["cert-manager"]},
# 	# ])

# 	NEXT_k8s_resource(new_name="zerossl-issuer", labels=["cert-manager"],
# 		objects=[
# 			"zerossl-eab:secret",
# 			"zerossl-issuer:clusterissuer",
# 		],
# 	)

# own app (docker build and such)
# ==========

#nmWatchPathsStr = str(local(['node', '-e', "console.log(require('./Scripts/NodeModuleWatchPaths.js').nmWatchPaths.join(','))"]))
#nmWatchPaths = nmWatchPathsStr.strip().split(",")
# this keeps the NMOverwrites folder up-to-date, with the live contents of the node-module watch-paths (as retrieved above)
#local(['npx', 'file-syncer', '--from'] + nmWatchPaths + ['--to', 'NMOverwrites', '--replacements', 'node_modules/web-vcore/node_modules/', 'node_modules/', '--clearAtLaunch', '--async', '--autoKill'])

USE_RELEASE_FLAG = False
USE_RELEASE_FLAG = PROD # comment this for faster release builds (though with less optimization)

# rust
# -----

# this is the nodejs-base dockerfile used for all subsequent rust images
imageURL_rustBase = registryURL + '/dm-rust-base-' + os.getenv("ENV")
docker_build(imageURL_rustBase, '.', dockerfile='Packages/deploy/@RustBase/Dockerfile',
	build_args={
		"env_ENV": os.getenv("ENV") or "dev",
		"debug_vs_release": "release" if USE_RELEASE_FLAG else "debug",
		"debug_vs_release_flag": "--release" if USE_RELEASE_FLAG else "",
	},
)

imageURL_monitorBackend = registryURL + '/dm-monitor-backend-' + os.getenv("ENV")
docker_build(imageURL_monitorBackend, '.', dockerfile='Packages/monitor-backend/Dockerfile',
	build_args={
		"RUST_BASE_URL": imageURL_rustBase,
		"env_ENV": os.getenv("ENV") or "dev",
		"debug_vs_release": "release" if USE_RELEASE_FLAG else "debug",
		"debug_vs_release_flag": "--release" if USE_RELEASE_FLAG else "",
		# todo: probably just always use dev/debug mode (there are very few users of the monitor tool, so compile speed is more important than execution speed)
		# docker doesn't seem to support string interpolation in COPY command, so do it here
		"copy_from_path": "/dm_repo/target/" + ("release" if USE_RELEASE_FLAG else "debug") + "/monitor-backend",
	},
)
imageURL_webServer = registryURL + '/dm-web-server-' + os.getenv("ENV")
docker_build(imageURL_webServer, '.', dockerfile='Packages/web-server/Dockerfile',
	build_args={
		"RUST_BASE_URL": imageURL_rustBase,
		"env_ENV": os.getenv("ENV") or "dev",
		"debug_vs_release": "release" if USE_RELEASE_FLAG else "debug",
		"debug_vs_release_flag": "--release" if USE_RELEASE_FLAG else "",
		# docker doesn't seem to support string interpolation in COPY command, so do it here
		"copy_from_path": "/dm_repo/target/" + ("release" if USE_RELEASE_FLAG else "debug") + "/web-server",
	},
)
imageURL_appServer = registryURL + '/dm-app-server-' + os.getenv("ENV")
docker_build(imageURL_appServer, '.', dockerfile='Packages/app-server/Dockerfile',
	build_args={
		"RUST_BASE_URL": imageURL_rustBase,
		"env_ENV": os.getenv("ENV") or "dev",
		"debug_vs_release": "release" if USE_RELEASE_FLAG else "debug",
		"debug_vs_release_flag": "--release" if USE_RELEASE_FLAG else "",
		# docker doesn't seem to support string interpolation in COPY command, so do it here
		"copy_from_path": "/dm_repo/target/" + ("release" if USE_RELEASE_FLAG else "debug") + "/app-server",
	},
)

# own app (deploy to kubernetes)
# ==========

k8s_yaml('./namespace.yaml')
k8s_yaml(ReadFileWithReplacements('./Packages/monitor-backend/deployment.yaml', {
	"TILT_PLACEHOLDER:imageURL_monitorBackend": imageURL_monitorBackend,
}))
k8s_yaml(ReadFileWithReplacements('./Packages/web-server/deployment.yaml', {
	"TILT_PLACEHOLDER:imageURL_webServer": imageURL_webServer,
}))
k8s_yaml(ReadFileWithReplacements('./Packages/app-server/deployment.yaml', {
	"TILT_PLACEHOLDER:imageURL_appServer": imageURL_appServer,
}))

# port forwards (see readme's [project-service-urls] guide-module for details)
# ==========

NEXT_k8s_resource_batch([
	{
		"workload": 'dm-monitor-backend',
		"trigger_mode": TRIGGER_MODE_MANUAL,
		"port_forwards": '5230:5130' if REMOTE else '5130',
		"labels": ["app"],
	},
	{
		"workload": 'dm-web-server',
		"trigger_mode": TRIGGER_MODE_MANUAL, # probably temp (can remove once client.build.prodQuick stops clearing the Dist folder prior to the new contents being available)
		"port_forwards": '5200:5100' if REMOTE else '5100',
		"labels": ["app"],
	},
	{
		"workload": 'dm-app-server',
		# Why manual? Because I want to avoid: type, save, [compile starts without me wanting it to], type and save again, [now I have to wait longer because the previous build is still running!]
		"trigger_mode": TRIGGER_MODE_MANUAL,
		"port_forwards": '5210:5110' if REMOTE else '5110',
		"labels": ["app"],
	},
])

# netdata
# ==========

# only install the netdata pods if we're in remote cluster (it can't collect anything useful in docker-desktop anyway; and removing it saves memory)
# temp-disabled (to make sure it's not messing up the cert-manager stuff, since some netdata pods were showing in its logs)
# if REMOTE:
# 	helm_remote('netdata',
# 		repo_url='https://netdata.github.io/helmchart',
# 		#version='1.33.1',
# 		version='3.7.12', # helm-chart version is different from netdata version
# 	)

# 	NEXT_k8s_resource_batch([
# 		{"workload": "netdata-parent", "labels": ["monitoring"]},
# 		{"workload": "netdata-child", "labels": ["monitoring"]},
# 		{
# 			"new_name": "netdata-other-objects", "labels": ["monitoring"],
# 			"objects": [
# 				"netdata:serviceaccount",
# 				"netdata-psp:podsecuritypolicy",
# 				"netdata:clusterrole",
# 				"netdata-psp:clusterrole",
# 				"netdata:clusterrolebinding",
# 				"netdata-psp:clusterrolebinding",
# 				"netdata-parent-database:persistentvolumeclaim",
# 				"netdata-parent-alarms:persistentvolumeclaim",
# 				"netdata-conf-parent:configmap",
# 				"netdata-conf-child:configmap",
# 				"netdata-child-sd-config-map:configmap",
# 				"netdata:ingress",
# 			],
# 		},
# 	])

# loki + prometheus + grafana
# ==========

helm_remote('loki-stack',
	repo_url='https://grafana.github.io/helm-charts',
	version='2.8.9', # helm-chart version may differ from vector version
	namespace='monitoring',
	create_namespace=True,
	# set=[],
	values=["./Packages/deploy/LokiStack/values.yaml"],
)
NEXT_k8s_resource_batch([
	{"labels": ["monitoring"], "workload": 'loki-stack'},
	{"labels": ["monitoring"], "workload": 'loki-stack-grafana', "port_forwards": '3200:3000' if REMOTE else '3000'},
	{"labels": ["monitoring"], "workload": 'loki-stack-kube-state-metrics'},
	{"labels": ["monitoring"], "workload": 'loki-stack-promtail'},
	{"labels": ["monitoring"], "workload": 'loki-stack-prometheus-node-exporter'},
	{"labels": ["monitoring"], "workload": 'loki-stack-prometheus-alertmanager'},
	{"labels": ["monitoring"], "workload": 'loki-stack-prometheus-pushgateway'},
	{"labels": ["monitoring"], "workload": 'loki-stack-prometheus-server'},
])

# extras
# ==========

# this is just for developer convenience, eg. for referencing to see when they last updated the remote k8s cluster
local(["node", "./Scripts/RecordTiltfileRun.js", ENV])
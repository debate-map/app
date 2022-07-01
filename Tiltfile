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
			fail("Cannot specify resource_deps, for resource \"" + thisResourceName + "\". (if you want to customize resource_deps, use the regular k8s_resource function)") # throw error # why?
		entry["resource_deps"] = resource_deps

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
		"postgres-operator:Namespace:default",
		#"traefik-attempt4:namespace",
		"app:namespace",
	],
)

# others (early)
# ==========

k8s_yaml('./Packages/deploy/NodeSetup/node-setup-daemon-set.yaml')
# since node-setup pod sleeps forever after running (causing readiness checks to fail/never-return... I think), don't wait for those readiness-checks to succeed
NEXT_k8s_resource("node-setup", pod_readiness='ignore')

# metrics-server (already present on OVH; but needs to be added for docker-desktop)
# ==========

if not REMOTE:
	k8s_yaml('./Packages/deploy/Monitors/metrics-server/components.yaml')
	NEXT_k8s_resource("metrics-server", labels=["monitoring"])

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

def ReplaceInBlob(fileBlob, replacements):
	blobAsStr = str(fileBlob)
	for key, value in replacements.items():
		blobAsStr = blobAsStr.replace(key, value)
	return blob(blobAsStr)
def ReadFileWithReplacements(filePath, replacements):
	fileBlob = read_file(filePath)
	fileBlob = ReplaceInBlob(fileBlob, replacements)
	return fileBlob

pulumiOutput = decode_json(str(read_file("./PulumiOutput_Public.json")))
registryURL = pulumiOutput["registryURL"]
bucket_uniformPrivate_url = pulumiOutput["bucket_prod_uniformPrivate_url" if PROD else "bucket_dev_uniformPrivate_url"]
bucket_uniformPrivate_name = pulumiOutput["bucket_prod_uniformPrivate_name" if PROD else "bucket_dev_uniformPrivate_name"]
#print("bucket_uniformPrivate_url:", bucket_uniformPrivate_url)

k8s_yaml(kustomize('./Packages/deploy/PGO/install'))
k8s_yaml(ReplaceInBlob(kustomize('./Packages/deploy/PGO/postgres'), {
	"TILT_PLACEHOLDER:bucket_uniformPrivate_name": bucket_uniformPrivate_name,
}))

# todo: probably move the "DO NOT RESTART" marker from the category to just the resources that need it (probably only the first one needs it)
pgo_crdName = "postgresclusters.postgres-operator.crunchydata.com:customresourcedefinition"
NEXT_k8s_resource(new_name='pgo_crd-definition',
	objects=[
		#"postgres-operator:Namespace:default",
		pgo_crdName, # the CRD definition?
	],
	pod_readiness='ignore',
	labels=["database_DO-NOT-RESTART-THESE"],
)

# Wait until the CRDs are ready.
#local_resource('pgo_crd-definition_ready', cmd='kubectl wait --for=condition=Established crd ' + pgo_crdName, resource_deps=GetLastResourceNamesBatch(), labels=["database_DO-NOT-RESTART-THESE"])
local_resource('pgo_crd-definition_ready',
	cmd="tilt wait --for=condition=Ready uiresource/pgo_crd-definition",
	resource_deps=GetLastResourceNamesBatch(),
	labels=["database_DO-NOT-RESTART-THESE"])
AddResourceNamesBatch_IfValid(["pgo_crd-definition_ready"])

NEXT_k8s_resource(new_name='pgo_crd-instance',
	objects=[
		"debate-map:postgrescluster", # the CRD instance?
	],
	labels=["database_DO-NOT-RESTART-THESE"],
)
NEXT_k8s_resource('pgo',
	objects=[
		#"debate-map:postgrescluster", # the CRD instance?
		"postgres-operator:clusterrole",
		"postgres-operator:clusterrolebinding",
		"pgo:serviceaccount",
		"debate-map-pguser-admin:secret",
		"pgo-gcs-creds:secret",
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

k8s_yaml(kustomize('./Packages/deploy/Monitors/pg-monitor-pack'))
# nothing depends on these pods, so don't wait for them to be "ready"
NEXT_k8s_resource("crunchy-prometheus", pod_readiness='ignore', labels=["monitoring"])
NEXT_k8s_resource("crunchy-alertmanager", pod_readiness='ignore', labels=["monitoring"])
NEXT_k8s_resource("crunchy-grafana", pod_readiness='ignore', labels=["monitoring"],
	port_forwards='4405:3000' if REMOTE else '3405:3000',
)
NEXT_k8s_resource(new_name="crunchy-others",
	pod_readiness='ignore',
	labels=["monitoring"],
	objects=[
		"alertmanager:serviceaccount",
		"grafana:serviceaccount",
		"prometheus-sa:serviceaccount",
		"prometheus-cr:clusterrole",
		"prometheus-crb:clusterrolebinding",
		"alertmanagerdata:persistentvolumeclaim",
		"grafanadata:persistentvolumeclaim",
		"prometheusdata:persistentvolumeclaim",
		"alertmanager-config:configmap",
		"alertmanager-rules-config:configmap",
		"crunchy-prometheus:configmap",
		"grafana-dashboards:configmap",
		"grafana-datasources:configmap",
		"grafana-secret:secret",
	])

# reflector
# ==========

'''load('ext://helm_remote', 'helm_remote')
helm_remote('reflector',
	#repo_name='stable',
	#repo_url='https://charts.helm.sh/stable',
	repo_url='https://emberstack.github.io/helm-charts',
	version='5.4.17',
)'''
# from: https://github.com/emberstack/kubernetes-reflector/releases/tag/v5.4.17
k8s_yaml("./Packages/deploy/Reflector/reflector.yaml")
k8s_yaml('./Packages/deploy/PGO/Custom/user-secret-mirror.yaml')
NEXT_k8s_resource("reflector",
	objects=[
		"reflector:clusterrole",
		"reflector:clusterrolebinding",
		"reflector:serviceaccount",
	],
)

# load-balancer/reverse-proxy (traefik)
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

# cert-manager (for creating/renewing SSL certificates)
# ==========

load('ext://helm_remote', 'helm_remote')
# only install the netdata pods if we're in remote cluster (it has nothing to do in local cluster)
if REMOTE:
	helm_remote('cert-manager',
		repo_url='https://charts.jetstack.io',
		version='1.8.2',
		namespace="cert-manager",
		create_namespace=True,
		set=[
			"installCRDs=true",
		],
	)

	NEXT_k8s_resource_batch([
		{"workload": "cert-manager", "labels": ["cert-manager"]},
		{"workload": "cert-manager-cainjector", "labels": ["cert-manager"]},
		{"workload": "cert-manager-webhook", "labels": ["cert-manager"]},
		{"workload": "cert-manager-startupapicheck", "labels": ["cert-manager"]},
		{
			"new_name": "cert-manager-other-objects", "labels": ["cert-manager"],
			"objects": [
				"cert-manager:namespace",
				"certificaterequests.cert-manager.io:customresourcedefinition",
				"certificates.cert-manager.io:customresourcedefinition",
				"challenges.acme.cert-manager.io:customresourcedefinition",
				"clusterissuers.cert-manager.io:customresourcedefinition",
				"issuers.cert-manager.io:customresourcedefinition",
				"orders.acme.cert-manager.io:customresourcedefinition",
				"cert-manager-webhook:mutatingwebhookconfiguration",
				"cert-manager-cainjector:serviceaccount",
				"cert-manager:serviceaccount",
				"cert-manager-webhook:serviceaccount",
				"cert-manager-startupapicheck:serviceaccount",
				"cert-manager-cainjector\\:leaderelection:role",
				"cert-manager\\:leaderelection:role",
				"cert-manager-webhook\\:dynamic-serving:role",
				"cert-manager-startupapicheck\\:create-cert:role",
				"cert-manager-cainjector:clusterrole",
				"cert-manager-controller-issuers:clusterrole",
				"cert-manager-controller-clusterissuers:clusterrole",
				"cert-manager-controller-certificates:clusterrole",
				"cert-manager-controller-orders:clusterrole",
				"cert-manager-controller-challenges:clusterrole",
				"cert-manager-controller-ingress-shim:clusterrole",
				"cert-manager-view:clusterrole",
				"cert-manager-edit:clusterrole",
				"cert-manager-controller-approve\\:cert-manager-io:clusterrole",
				"cert-manager-controller-certificatesigningrequests:clusterrole",
				"cert-manager-webhook\\:subjectaccessreviews:clusterrole",
				"cert-manager-cainjector\\:leaderelection:rolebinding",
				"cert-manager\\:leaderelection:rolebinding",
				"cert-manager-webhook\\:dynamic-serving:rolebinding",
				"cert-manager-startupapicheck\\:create-cert:rolebinding",
				"cert-manager-cainjector:clusterrolebinding",
				"cert-manager-controller-issuers:clusterrolebinding",
				"cert-manager-controller-clusterissuers:clusterrolebinding",
				"cert-manager-controller-certificates:clusterrolebinding",
				"cert-manager-controller-orders:clusterrolebinding",
				"cert-manager-controller-challenges:clusterrolebinding",
				"cert-manager-controller-ingress-shim:clusterrolebinding",
				"cert-manager-controller-approve\\:cert-manager-io:clusterrolebinding",
				"cert-manager-controller-certificatesigningrequests:clusterrolebinding",
				"cert-manager-webhook\\:subjectaccessreviews:clusterrolebinding",
				"cert-manager-webhook:configmap",
				"cert-manager-webhook:validatingwebhookconfiguration",
			],
		},
	])

	k8s_yaml(ReadFileWithReplacements('./Packages/deploy/CertManager/cert-manager.yaml', {
		"TILT_PLACEHOLDER:eab_hmacKey": os.getenv("EAB_HMAC_KEY"),
		"TILT_PLACEHOLDER:eab_kid": os.getenv("EAB_KID"),
	}))
	# NEXT_k8s_resource_batch([
	# 	{"workload": "ssl-prod", "labels": ["cert-manager"]},
	# ])

	NEXT_k8s_resource(new_name="ssl-prod", labels=["cert-manager"],
		objects=[
			"zero-sll-eabsecret:secret",
			"ssl-prod:clusterissuer",
		],
	)

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
imageURL_appServerRS = registryURL + '/dm-app-server-rs-' + os.getenv("ENV")
docker_build(imageURL_appServerRS, '.', dockerfile='Packages/app-server-rs/Dockerfile',
	build_args={
		"RUST_BASE_URL": imageURL_rustBase,
		"env_ENV": os.getenv("ENV") or "dev",
		"debug_vs_release": "release" if USE_RELEASE_FLAG else "debug",
		"debug_vs_release_flag": "--release" if USE_RELEASE_FLAG else "",
		# docker doesn't seem to support string interpolation in COPY command, so do it here
		"copy_from_path": "/dm_repo/target/" + ("release" if USE_RELEASE_FLAG else "debug") + "/app-server-rs",
	},
)

# nodejs
# -----

# this is the nodejs-base dockerfile used for all subsequent js images
imageURL_jsBase = registryURL + '/dm-js-base-' + os.getenv("ENV")
docker_build(imageURL_jsBase, '.', dockerfile='Packages/deploy/@JSBase/Dockerfile')

imageURL_webServer = registryURL + '/dm-web-server-' + os.getenv("ENV")
docker_build(imageURL_webServer, '.', dockerfile='Packages/web-server/Dockerfile',
	build_args={
		"JS_BASE_URL": imageURL_jsBase,
		"env_ENV": os.getenv("ENV") or "dev",
	},
	# this lets Tilt update the listed files directly, without involving Docker at all (though must enable this, per session, through tilt-ui)
	# live_update=[
	# 	#sync('./NMOverwrites/', '/dm_repo/'),
	# 	sync('./.yalc/', '/dm_repo/.yalc/'),
	# 	sync('./Packages/js-common/', '/dm_repo/Packages/js-common/'),
	# 	#sync('./Packages/web-server/Dist/', '/dm_repo/Packages/web-server/Dist/'),
	# 	sync('./Packages/web-server/', '/dm_repo/Packages/web-server/'),
	# 	# temp-synced folder (eg. for adding temp log-lines to node-modules) 
	# 	#sync('./Temp_Synced/', '/dm_repo/Temp_Synced/'),
	# ]
)
imageURL_appServerJS = registryURL + '/dm-app-server-js-' + os.getenv("ENV")
docker_build(imageURL_appServerJS, '.', dockerfile='Packages/app-server/Dockerfile',
	build_args={
		"JS_BASE_URL": imageURL_jsBase,
		"env_ENV": os.getenv("ENV") or "dev"
	},
	# this lets Tilt update the listed files directly, without involving Docker at all (though must enable this, per session, through tilt-ui)
	# live_update=[
	# 	#sync('./NMOverwrites/', '/dm_repo/'),
	# 	sync('./.yalc/', '/dm_repo/.yalc/'),
	# 	sync('./Packages/js-common/', '/dm_repo/Packages/js-common/'),
	# 	#sync('./Packages/app-server/Dist/', '/dm_repo/Packages/app-server/Dist/'),
	# 	sync('./Packages/app-server/', '/dm_repo/Packages/app-server/'),
	# 	# temp-synced folder (eg. for adding temp log-lines to node-modules) 
	# 	#sync('./Temp_Synced/', '/dm_repo/Temp_Synced/'),
	# 	#sync('./Temp_Synced/@graphile/subscriptions-lds/dist', '/dm_repo/node_modules/@graphile/subscriptions-lds/dist'),
	# 	#sync('./Temp_Synced/postgraphile', '/dm_repo/node_modules/postgraphile'),
	# ]
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
k8s_yaml(ReadFileWithReplacements('./Packages/app-server-rs/deployment.yaml', {
	"TILT_PLACEHOLDER:imageURL_appServerRS": imageURL_appServerRS,
}))
k8s_yaml(ReadFileWithReplacements('./Packages/app-server/deployment.yaml', {
	"TILT_PLACEHOLDER:imageURL_appServerJS": imageURL_appServerJS,
}))

# port forwards (see readme's [project-service-urls] guide-module for details)
# ==========

NEXT_k8s_resource_batch([
	{
		"workload": 'dm-monitor-backend',
		"trigger_mode": TRIGGER_MODE_MANUAL,
		"port_forwards": [
			'5230:5130' if REMOTE else '5130',
		],
		"labels": ["app"],
	},
	{
		"workload": 'dm-web-server',
		"trigger_mode": TRIGGER_MODE_MANUAL, # probably temp (can remove once client.build.prodQuick stops clearing the Dist folder prior to the new contents being available)
		#"extra_pod_selectors": {"app": "dm-web-server"}, # this is needed fsr
		#"port_forwards": '5100:31005')
		"port_forwards": '5200:5100' if REMOTE else '5100',
		"labels": ["app"],
	},
	{
		"workload": 'dm-app-server-rs',
		# Why manual? Because I want to avoid: type, save, [compile starts without me wanting it to], type and save again, [now I have to wait longer because the previous build is still running!]
		"trigger_mode": TRIGGER_MODE_MANUAL,
		"port_forwards": [
			'5210:5110' if REMOTE else '5110',
		],
		"labels": ["app"],
	},
	{
		"workload": 'dm-app-server-js',
		"trigger_mode": TRIGGER_MODE_MANUAL,
		"port_forwards": [
			'5215:5115' if REMOTE else '5115',
			'5216:5116' if REMOTE else '5116' # for nodejs-inspector
		],
		"labels": ["app"],
	}
])

# new relic (commented for now, because of apparent performance impact) [and left commented, because I want to find all open-source tools long-term -- or at least, totally customizable, which new-relic is not]
# ==========

# '''k8s_yaml('./Packages/deploy/NewRelic/px.dev_viziers.yaml', allow_duplicates=True)
# k8s_yaml('./Packages/deploy/NewRelic/olm_crd.yaml', allow_duplicates=True)
# k8s_yaml('./Packages/deploy/NewRelic/newrelic-manifest.yaml', allow_duplicates=True)'''

# k8s_yaml_grouped('./Packages/deploy/NewRelic/px.dev_viziers.yaml', "new-relic")
# k8s_yaml_grouped('./Packages/deploy/NewRelic/olm_crd.yaml', "new-relic")
# # kubectl create namespace newrelic (for now, the "newrelic" namespace is created manually in ./namespace.yaml)
# k8s_yaml_grouped('./Packages/deploy/NewRelic/newrelic-manifest.yaml', "new-relic", [
# 	# stage +1
# 	"nri-bundle-nri-metadata-injection-admission-create", # dep: nri-bundle-nri-metadata-injection-admission:serviceaccount
# 	# stage +2
# 	"nri-bundle-nri-metadata-injection", # dep: X
# 	# stage +3
# 	"nri-bundle-nri-metadata-injection-admission-patch", # dep: X
# 	"pixie-operator-subscription:subscription", # dep: X:namespace
# 	"olm-operators:operatorgroup", # dep: X:namespace
# 	"olm-operator", # dep: X:namespace
# 	"catalog-operator", # dep: X:namespace
# 	# to not wait for
# 	"nri-bundle-newrelic-pixie", # dep: pl-cluster-secrets->cluster-id, which takes time for other pods to push
# 	"vizier-deleter", # dep: some service-account, which takes time for other pods to push
# ])

# NEXT_k8s_resource_batch([
# 	"nri-bundle-nri-metadata-injection-admission-create",
# ], labels=["new-relic"])

# NEXT_k8s_resource_batch([
# 	"nri-bundle-nri-metadata-injection",
# ], labels=["new-relic"])

# NEXT_k8s_resource_batch([
# 	"nri-bundle-nri-metadata-injection-admission-patch",
# 	"pixie-operator-subscription:subscription",
# 	"olm-operators:operatorgroup",
# 	"olm-operator",
# 	"catalog-operator",
# ], labels=["new-relic"])

# NEXT_k8s_resource_batch([
# 	"nri-bundle-newrelic-pixie",
# 	"vizier-deleter",
# ], pod_readiness='ignore', labels=["new-relic"])

# netdata
# ==========

# only install the netdata pods if we're in remote cluster (it can't collect anything useful in docker-desktop anyway; and removing it saves memory)
if REMOTE:
	helm_remote('netdata',
		repo_url='https://netdata.github.io/helmchart',
		#version='1.33.1',
		version='3.7.12', # helm-chart version is different from netdata version
	)

	NEXT_k8s_resource_batch([
		{"workload": "netdata-parent", "labels": ["monitoring"]},
		{"workload": "netdata-child", "labels": ["monitoring"]},
		{
			"new_name": "netdata-other-objects", "labels": ["monitoring"],
			"objects": [
				"netdata:serviceaccount",
				"netdata-psp:podsecuritypolicy",
				"netdata:clusterrole",
				"netdata-psp:clusterrole",
				"netdata:clusterrolebinding",
				"netdata-psp:clusterrolebinding",
				"netdata-parent-database:persistentvolumeclaim",
				"netdata-parent-alarms:persistentvolumeclaim",
				"netdata-conf-parent:configmap",
				"netdata-conf-child:configmap",
				"netdata-child-sd-config-map:configmap",
				"netdata:ingress",
			],
		},
	])

# extras
# ==========

# this is just for developer convenience, eg. for referencing to see when they last updated the remote k8s cluster
local(["node", "./Scripts/RecordTiltfileRun.js", ENV])
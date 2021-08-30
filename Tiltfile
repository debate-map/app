# allow using tilt to also push to the remote OVHcloud k8s cluster
allow_k8s_contexts('ovh')

#print("Env vars:", os.environ)

ENV = os.getenv("ENV")
DEV = ENV == "dev"
PROD = ENV == "prod"
print("Env:", ENV)

CONTEXT = os.getenv("CONTEXT")
REMOTE = CONTEXT != "local"
print("Context:", CONTEXT, "Remote:", REMOTE)

# namespaces
# ==========

# Never manually-restart this "namespaces" group! (deletion of namespaces can get frozen, and it's a pain to manually restart)
k8s_resource(new_name="namespaces",
	objects=[
		"postgres-operator:Namespace:default",
		#"traefik-attempt4:namespace",
		"app:namespace",
	],
)

# prometheus
# ==========

#k8s_yaml(kustomize('./Packages/deploy/Monitors/kube-prometheus/overlay'))
'''load(
    #'ext://coreos_prometheus',
    'Packages/deploy/Monitors/kube-prometheus/Tiltfile',
    'setup_monitoring',
    'get_prometheus_resources',
    'get_prometheus_dependencies',
)
setup_monitoring()'''
# k8s_resource(
#     'my-resource',
#     objects=get_prometheus_resources(my_deployment, 'my-resource'),
#     resource_deps=get_prometheus_dependencies(),
# )

load(
	'Packages/deploy/Monitors/prometheus-pack/Tiltfile',
	'install'
)
install()

k8s_resource("prometheus",
	objects=[
		"vfiles-configmap:configmap",
	],
	resource_deps=["namespaces"],
	labels=["monitoring"],
)
k8s_resource("grafana",
	objects=[
		"grafana-config-monitoring:configmap",
		"grafana-dashboards:configmap",
		"grafana-datasources:configmap",
		"grafana-dashboard-kubernetes-cluster:configmap",
		"grafana-dashboard-node-exporter-full:configmap",
	],
	resource_deps=["prometheus"],
	labels=["monitoring"],
)
k8s_resource("node-exporter",
	objects=[
		"node-exporter-claim0:persistentvolumeclaim",
		"node-exporter-claim1:persistentvolumeclaim",
	],
	resource_deps=["prometheus"],
	labels=["monitoring"],
)
'''k8s_resource("cadvisor",
	objects=[
		"cadvisor-claim0:persistentvolumeclaim",
		"cadvisor-claim1:persistentvolumeclaim",
		"cadvisor-claim2:persistentvolumeclaim",
	],
	resource_deps=["prometheus"],
)'''

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
#print("Test1:", pulumiOutput)

k8s_yaml(kustomize('./Packages/deploy/PGO/install'))
k8s_yaml(ReplaceInBlob(kustomize('./Packages/deploy/PGO/postgres'), {
	"TILT_PLACEHOLDER:bucket_uniformPrivate_name": bucket_uniformPrivate_name,
}))

# todo: probably move the "DO NOT RESTART" marker from the category to just the resources that need it (probably only the first one needs it)
k8s_resource(new_name='pgo_early',
	objects=[
		#"postgres-operator:Namespace:default",
		"postgresclusters.postgres-operator.crunchydata.com:customresourcedefinition", # the CRD definition?
	],
	resource_deps=["namespaces"],
	labels=["database_DO-NOT-RESTART-THESE"],
)
k8s_resource('pgo',
	objects=[
		"debate-map:postgrescluster", # the CRD instance?
		"postgres-operator:clusterrole",
		"postgres-operator:clusterrolebinding",
		"pgo:serviceaccount",
		"debate-map-pguser-admin:secret",
		"pgo-gcs-creds:secret",
	],
	resource_deps=["pgo_early"],
	labels=["database_DO-NOT-RESTART-THESE"],
)
k8s_resource(new_name='pgo_late',
	objects=["empty1"],
	extra_pod_selectors={
		"postgres-operator.crunchydata.com/cluster": "debate-map",
		"postgres-operator.crunchydata.com/role": "master"
	},
	port_forwards='4205:5432' if REMOTE else '3205:5432',
	resource_deps=["pgo"],
	labels=["database_DO-NOT-RESTART-THESE"],
)

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
k8s_resource("reflector",
	objects=[
		"reflector:clusterrole",
		"reflector:clusterrolebinding",
		"reflector:serviceaccount",
	],
	resource_deps=["pgo_late"],
)

# load-balancer/reverse-proxy (traefik)
# ==========

k8s_yaml(kustomize('./Packages/deploy/LoadBalancer/@Attempt6'))
k8s_resource("traefik-daemon-set",
	labels=["traefik"],
)
k8s_resource(new_name="traefik",
	objects=[
		"traefik-ingress-controller:serviceaccount",
   	"traefik-ingress-controller:clusterrole",
   	"traefik-ingress-controller:clusterrolebinding",
   	"dmvx-ingress:ingress",
	],
	resource_deps=["reflector"],
	labels=["traefik"],
)

# commented till I get traefik working in general
#k8s_yaml("Packages/deploy/LoadBalancer/traefik-dashboard.yaml")

# own app (docker build and such)
# ==========

nmWatchPathsStr = str(local(['node', '-e', "console.log(require('./Scripts/NodeModuleWatchPaths.js').nmWatchPaths.join(','))"]))
nmWatchPaths = nmWatchPathsStr.strip().split(",")
# this keeps the NMOverwrites folder up-to-date, with the live contents of the node-module watch-paths (as retrieved above)
local(['npx', 'file-syncer', '--from'] + nmWatchPaths + ['--to', 'NMOverwrites', '--replacements', 'node_modules/web-vcore/node_modules/', 'node_modules/', '--clearAtLaunch', '--async', '--autoKill'])

# this is the base dockerfile used for all the subsequent ones
imageURL_sharedBase = registryURL + '/dm-shared-base'
docker_build(imageURL_sharedBase, '.', dockerfile='Packages/deploy/@DockerBase/Dockerfile')

imageURL_webServer = registryURL + '/dm-web-server'
docker_build(imageURL_webServer, '.', dockerfile='Packages/web-server/Dockerfile',
	build_args={
		#"SHARED_BASE_URL": imageURL_sharedBase, # commented for now, since Tilt thinks shared-base image is unused unless hard-coded
		"env_ENV": os.getenv("ENV") or "dev",
	},
	# this lets Tilt update the listed files directly, without involving Docker at all
	live_update=[
		sync('./NMOverwrites/', '/dm_repo/'),
		#sync('./Packages/web-server/Dist/', '/dm_repo/Packages/web-server/Dist/'),
		sync('./Packages/web-server/', '/dm_repo/Packages/web-server/'),
	])
imageURL_appServer = registryURL + '/dm-app-server'
docker_build(imageURL_appServer, '.', dockerfile='Packages/app-server/Dockerfile',
	build_args={
		#"SHARED_BASE_URL": imageURL_sharedBase, # commented for now, since Tilt thinks shared-base image is unused unless hard-coded
		"env_ENV": os.getenv("ENV") or "dev"
	},
	# this lets Tilt update the listed files directly, without involving Docker at all
	live_update=[
		sync('./NMOverwrites/', '/dm_repo/'),
		#sync('./Packages/app-server/Dist/', '/dm_repo/Packages/app-server/Dist/'),
		sync('./Packages/app-server/', '/dm_repo/Packages/app-server/'),
	])

# own app (deploy to kubernetes)
# ==========

k8s_yaml('./namespace.yaml')
k8s_yaml(ReadFileWithReplacements('./Packages/web-server/deployment.yaml', {
	"TILT_PLACEHOLDER:imageURL_webServer": imageURL_webServer,
}))
k8s_yaml(ReadFileWithReplacements('./Packages/app-server/deployment.yaml', {
	"TILT_PLACEHOLDER:imageURL_appServer": imageURL_appServer,
}))

# port forwards
# ==========

k8s_resource('dm-app-server', 
	#extra_pod_selectors={"app": "dm-app-server"}, # this is needed fsr
	port_forwards='4105' if REMOTE else '3105',
	resource_deps=["traefik"],
	labels=["app"],
)

# the web-server forward works, but it makes 31005 unusuable then (I guess can only forward to one port at once); app-server forward didn't work
k8s_resource('dm-web-server', 
	#extra_pod_selectors={"app": "dm-web-server"}, # this is needed fsr
	#port_forwards='3005:31005')
	port_forwards='4005' if REMOTE else '3005',
	#resource_deps=["dm-app-server"],
	resource_deps=["traefik"],
	labels=["app"],
)

# extras
# ==========

# this is just for developer convenience, eg. for referencing to see when they last updated the remote k8s cluster
local(["node", "./Scripts/RecordTiltfileRun.js", ENV])
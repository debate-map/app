# allows using tilt to push to the "local" k8s cluster
#allow_k8s_contexts('local')

# allow using tilt to push to the remote OVHcloud k8s cluster
allow_k8s_contexts('ovh')

#k8s_yaml('./Packages/deploy/k8s_entry.yaml')

ENV = os.getenv("ENV")
DEV = ENV == "dev"
PROD = ENV == "prod"
print("Env:", ENV)

# namespaces
# ==========

# Never manually-restart this "namespaces" group! (deletion of namespaces can get frozen, and it's a pain to manually restart)
k8s_resource(new_name="namespaces",
	objects=[
		"postgres-operator:Namespace:default",
		"traefik-attempt4:namespace",
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
)
k8s_resource("node-exporter",
	objects=[
		"node-exporter-claim0:persistentvolumeclaim",
		"node-exporter-claim1:persistentvolumeclaim",
	],
	resource_deps=["prometheus"],
)
k8s_resource("cadvisor",
	objects=[
		"cadvisor-claim0:persistentvolumeclaim",
		"cadvisor-claim1:persistentvolumeclaim",
		"cadvisor-claim2:persistentvolumeclaim",
	],
	resource_deps=["prometheus"],
)

# crunchydata postgres operator
# ==========

k8s_yaml(kustomize('./Packages/deploy/PGO/install'))
k8s_yaml(kustomize('./Packages/deploy/PGO/postgres'))

k8s_resource('pgo',
	objects=[
		#"postgres-operator:Namespace:default",
		"postgresclusters.postgres-operator.crunchydata.com:customresourcedefinition",
		"postgres-operator:clusterrole",
		"postgres-operator:clusterrolebinding",
		"pgo:serviceaccount",
		"debate-map-pguser-admin:secret",
	],
	extra_pod_selectors={
		"postgres-operator.crunchydata.com/cluster": "debate-map",
		"postgres-operator.crunchydata.com/role": "master"
	},
	port_forwards='3205:5432' if DEV else '4205:5432',
	resource_deps=["namespaces"],
)
'''k8s_resource(new_name="database",
	objects=["debate-map:PostgresCluster:postgres-operator"],
	#objects=["postgres-operator:ClusterRole:default"],
	extra_pod_selectors={
		"postgres-operator.crunchydata.com/cluster": "debate-map",
		"postgres-operator.crunchydata.com/role": "master"
	},
	port_forwards='3205:5432' if DEV else None,
	resource_deps=["pgo"],
)'''
'''k8s_resource(new_name="database",
	objects=[
		"pgo:serviceaccount",
	],
	extra_pod_selectors={
		"postgres-operator.crunchydata.com/cluster": "debate-map",
		"postgres-operator.crunchydata.com/role": "master"
	},
	port_forwards='3205:5432' if DEV else '4205:5432',
	resource_deps=["pgo"],
)'''

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
	#resource_deps=["database"],
	resource_deps=["pgo"],
)

# load-balancer/reverse-proxy (traefik)
# ==========

#k8s_yaml("./Packages/deploy/LoadBalancer/traefik.yaml")
'''load('ext://helm_remote', 'helm_remote')
helm_remote('traefik', repo_url='https://helm.traefik.io/traefik',
	values=['Packages/deploy/LoadBalancer/traefik-config.yaml'])
k8s_resource("traefik",
	resource_deps=["reflector"],
)'''

k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt4/traefik-definitions.yaml")
k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt4/traefik-roles.yaml")
k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt4/traefik.yaml")
k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt4/traefik-service.yaml")
k8s_yaml("./Packages/deploy/LoadBalancer/@Attempt4/traefik-routes.yaml")
k8s_resource("traefik",
	objects=[
		#"traefik-attempt4:namespace",
		"ingressroutes.traefik.containo.us:customresourcedefinition",
		"ingressroutetcps.traefik.containo.us:customresourcedefinition",
		"middlewares.traefik.containo.us:customresourcedefinition",
		"tlsoptions.traefik.containo.us:customresourcedefinition",
		"traefik-ingress-controller:serviceaccount",
		"traefik-ingress-controller:clusterrole",
		"traefik-ingress-controller:clusterrolebinding",
		"simpleingressroute:ingressroute",
		"ingressroutetls:ingressroute",
	],
	resource_deps=["reflector"],
)

# commented till I get traefik working in general
#k8s_yaml("Packages/deploy/LoadBalancer/traefik-dashboard.yaml")

# own app
# ==========

k8s_resource(new_name="general",
	objects=[
		#"app:namespace",
		"debate-map:postgrescluster",
	],
	resource_deps=["traefik"],
)

k8s_yaml('./namespace.yaml')
k8s_yaml('./Packages/web-server/deployment.yaml')
k8s_yaml('./Packages/app-server/deployment.yaml')

# rest
# ==========

nmWatchPathsStr = local(['node', '-e', "console.log(require('./Scripts/NodeModuleWatchPaths.js').nmWatchPaths.join(','))"])
nmWatchPaths = str(nmWatchPathsStr).strip().split(",")
# liveUpdateEntries_shared = []
# for path in nmWatchPaths:
# 	liveUpdateEntries_shared.append(sync('./' + path, '/dm_repo/' + path))

# this keeps the NMOverwrites folder up-to-date, with the live contents of the node-module watch-paths (as retrieved above)
#local(['node', 'Scripts/NMOverwrites/Build.js', '--async'])
local(['npx', 'file-syncer', '--from'] + nmWatchPaths + ['--to', 'NMOverwrites', '--replacements', 'node_modules/web-vcore/node_modules/', 'node_modules/', '--clearAtLaunch', '--async', '--autoKill'])

# this is the base dockerfile used for all the subsequent ones
#docker_build('local.tilt.dev/dm-repo-shared-base', '.', dockerfile='Packages/deploy/@DockerBase/Dockerfile')
# use gcr... as the name, so that when we're doing an actual deploy, the name of this dependency (in the images below, eg. dm-web-server) does not need changing
docker_build('gcr.io/debate-map-prod/dm-shared-base', '.', dockerfile='Packages/deploy/@DockerBase/Dockerfile')

docker_build('gcr.io/debate-map-prod/dm-web-server', '.', dockerfile='Packages/web-server/Dockerfile',
	build_args={'env_ENV': os.getenv("ENV") or "dev"},
	# this lets Tilt update the listed files directly, without involving Docker at all
	#live_update=liveUpdateEntries_shared + [
	live_update=[
		sync('./NMOverwrites/', '/dm_repo/'),
		#sync('./Packages/web-server/Dist/', '/dm_repo/Packages/web-server/Dist/'),
		sync('./Packages/web-server/', '/dm_repo/Packages/web-server/'),
	])
docker_build('gcr.io/debate-map-prod/dm-app-server', '.', dockerfile='Packages/app-server/Dockerfile',
	build_args={'env_ENV': os.getenv("ENV") or "dev"},
	# this lets Tilt update the listed files directly, without involving Docker at all
	#live_update=liveUpdateEntries_shared + [
	live_update=[
		sync('./NMOverwrites/', '/dm_repo/'),
		#sync('./Packages/app-server/Dist/', '/dm_repo/Packages/app-server/Dist/'),
		sync('./Packages/app-server/', '/dm_repo/Packages/app-server/'),
	])

# port forwards
# ==========

k8s_resource('dm-app-server', 
	#extra_pod_selectors={"app": "dm-app-server"}, # this is needed fsr
	#port_forwards='3105:31006')
	port_forwards='3105' if DEV else '4105',
	resource_deps=["general"],
)

# the web-server forward works, but it makes 31005 unusuable then (I guess can only forward to one port at once); app-server forward didn't work
k8s_resource('dm-web-server', 
	#extra_pod_selectors={"app": "dm-web-server"}, # this is needed fsr
	#port_forwards='3005:31005')
	port_forwards='3005' if DEV else '4005',
	#resource_deps=["dm-app-server"],
	resource_deps=["general"],
)
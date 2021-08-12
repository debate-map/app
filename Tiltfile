#k8s_yaml('./Packages/deploy/k8s_entry.yaml')
# todo: integrate these into the entry-file above (probably)
k8s_yaml(kustomize('./Packages/deploy/install'))
k8s_yaml(kustomize('./Packages/deploy/postgres'))
k8s_yaml('./Packages/server/deployment.yaml')
k8s_yaml('./Packages/web-server/deployment.yaml')

#import subprocess
#nmWatchPathsStr = subprocess.run(['node', '-e', "console.log(require('./Scripts/NodeModuleWatchPaths.js').default.join(','))"], stdout=subprocess.PIPE).stdout.decode('utf-8')
#nmWatchPathsStr = local("node -e \"console.log(require('./Scripts/NodeModuleWatchPaths.js').default.join(','))\"")
nmWatchPathsStr = local(['node', '-e', "console.log(require('./Scripts/NodeModuleWatchPaths.js').default.join(','))"])
nmWatchPaths = str(nmWatchPathsStr).split(",")
#liveUpdatePaths_shared = [
#	*nmWatchPaths
#]
liveUpdateEntries_shared = []
for path in nmWatchPaths:
	liveUpdateEntries_shared.append(sync('./' + path, '/dm_repo/' + path))

# this is the base dockerfile used for all the subsequent ones
docker_build('local.tilt.dev/dm-repo-shared-base', '.', dockerfile='Packages/deploy/@DockerBase/dockerfile')

#docker_build('dm-server', 'Packages/server')
#docker_build('dm-web-server', 'Packages/web-server')
docker_build('dm-server', '.', dockerfile='Packages/server/Dockerfile', live_update=liveUpdateEntries_shared + [
	sync('./Packages/server/Dist', '/dm_repo/Packages/server/Dist')
])
docker_build('dm-web-server', '.', dockerfile='Packages/web-server/Dockerfile', live_update=liveUpdateEntries_shared + [
	sync('./Packages/web-server/Dist', '/dm_repo/Packages/web-server/Dist'),

	# test
	sync('./node_modules/web-vcore/node_modules/mobx-graphlink/Dist', '/dm_repo/node_modules/mobx-graphlink/Dist')
])

#k8s_resource('debate-map-primary', port_forwards='5432:5432') # db
#k8s_resource('pgo', port_forwards='3205:5432') # db
k8s_resource('pgo',
	extra_pod_selectors={
		"postgres-operator.crunchydata.com/cluster": "debate-map",
		"postgres-operator.crunchydata.com/role": "master"
	},
	port_forwards='3205:5432') # db
k8s_resource('dm-web-server', 
	extra_pod_selectors={"app": "dm-web-server"}, # this is needed fsr
	port_forwards='3005:31005')
k8s_resource('dm-server', 
	extra_pod_selectors={"app": "dm-server"}, # this is needed fsr
	port_forwards='3105:31105')
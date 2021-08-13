#k8s_yaml('./Packages/deploy/k8s_entry.yaml')
# todo: integrate these into the entry-file above (probably)
k8s_yaml(kustomize('./Packages/deploy/install'))
k8s_yaml(kustomize('./Packages/deploy/postgres'))
k8s_yaml('./Packages/server/deployment.yaml')
k8s_yaml('./Packages/web-server/deployment.yaml')

nmWatchPathsStr = local(['node', '-e', "console.log(require('./Scripts/NodeModuleWatchPaths.js').nmWatchPaths.join(','))"])
nmWatchPaths = str(nmWatchPathsStr).strip().split(",")
'''liveUpdateEntries_shared = []
for path in nmWatchPaths:
	liveUpdateEntries_shared.append(sync('./' + path, '/dm_repo/' + path))'''

# this keeps the NMOverwrites folder up-to-date, with the live contents of the node-module watch-paths (as retrieved above)
#local(['node', 'Scripts/NMOverwrites/Build.js', '--async'])
local(['npx', 'file-syncer', '--from'] + nmWatchPaths + ['--to', 'NMOverwrites', '--replacements', 'node_modules/web-vcore/node_modules/', 'node_modules/', '--clearAtLaunch', '--async', '--autoKill'])

# this is the base dockerfile used for all the subsequent ones
docker_build('local.tilt.dev/dm-repo-shared-base', '.', dockerfile='Packages/deploy/@DockerBase/Dockerfile')

docker_build('dm-server', '.', dockerfile='Packages/server/Dockerfile',
	# this lets Tilt update the listed files directly, without involving Docker at all
	#live_update=liveUpdateEntries_shared + [
	live_update=[
		sync('./NMOverwrites/', '/dm_repo/'),
		sync('./Packages/server/Dist/', '/dm_repo/Packages/server/Dist/'),
	])
docker_build('dm-web-server', '.', dockerfile='Packages/web-server/Dockerfile',
	# this lets Tilt update the listed files directly, without involving Docker at all
	#live_update=liveUpdateEntries_shared + [
	live_update=[
		sync('./NMOverwrites/', '/dm_repo/'),
		sync('./Packages/web-server/Dist/', '/dm_repo/Packages/web-server/Dist/'),
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
#k8s_yaml('./Packages/deploy/k8s_entry.yaml')
# todo: integrate these into the entry-file above (probably)
k8s_yaml(kustomize('./Packages/deploy/install'))
k8s_yaml(kustomize('./Packages/deploy/postgres'))
k8s_yaml('./Packages/server/deployment.yaml')
k8s_yaml('./Packages/web-server/deployment.yaml')

#docker_build('dm-server', 'Packages/server')
#docker_build('dm-web-server', 'Packages/web-server')
docker_build('dm-server', '.', dockerfile='Packages/server/Dockerfile')
docker_build('dm-web-server', '.', dockerfile='Packages/web-server/Dockerfile')

#k8s_resource('debate-map-primary', port_forwards='5432:5432') # db
#k8s_resource('pgo', port_forwards='3205:5432') # db
k8s_resource('pgo',
	extra_pod_selectors={
		"postgres-operator.crunchydata.com/cluster": "debate-map",
		"postgres-operator.crunchydata.com/role": "master"
	},
	port_forwards='3205:5432') # db
k8s_resource('dm-web-server', port_forwards='3005:31005')
k8s_resource('dm-server', port_forwards='3105:31105')
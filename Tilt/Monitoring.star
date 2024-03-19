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

def Start_Monitoring(g):
	# moved to Main.star, so can happen before usage in Traefic_Gateway.star (->routes.yaml)
	#CreateNamespace(g, k8s_yaml, "monitoring")

	# netdata
	# ==========

	# only install the netdata pods if we're in remote cluster (it can't collect anything useful in docker-desktop anyway; and removing it saves memory)
	if g["REMOTE"]:
		helm_remote('netdata',
			repo_url='https://netdata.github.io/helmchart',
			#version='1.33.1',
			version='3.7.84', # helm-chart version is different from netdata version
		)

		NEXT_k8s_resource_batch(g, [
			{"workload": "netdata-parent", "labels": ["monitoring"]},
			{"workload": "netdata-child", "labels": ["monitoring"]},
			{
				"new_name": "netdata-other-objects", "labels": ["monitoring"],
				"objects": [
					"netdata:serviceaccount",
					#"netdata-psp:podsecuritypolicy",
					#"netdata-psp:clusterrolebinding",
					#"netdata-psp:clusterrole",
					"netdata:clusterrole",
					"netdata:clusterrolebinding",
					"netdata-parent-database:persistentvolumeclaim",
					"netdata-parent-alarms:persistentvolumeclaim",
					"netdata-conf-parent:configmap",
					"netdata-conf-child:configmap",
					"netdata-child-sd-config-map:configmap",
					"netdata:ingress",
				],
			},
		])

	# loki + prometheus + grafana
	# ==========

	helm_remote('loki-stack',
		repo_url='https://grafana.github.io/helm-charts',
		version='2.10.2', # helm-chart version may differ from vector version
		namespace='monitoring',
		# create_namespace=True,
		# set=[],
		values=["../Packages/deploy/LokiStack/values.yaml"],
	)
	NEXT_k8s_resource_batch(g, [
		{"labels": ["monitoring"], "new_name": 'loki-stack-early', "objects": [
			"loki-stack:configmap",
			"loki-stack:secret",
			"loki-stack:serviceaccount",
			"loki-stack:rolebinding",
			"loki-stack:role",
		]},
	]);
	NEXT_k8s_resource_batch(g, [
		{"labels": ["monitoring"], "workload": 'loki-stack'},
	]);
	NEXT_k8s_resource_batch(g, [
		{"labels": ["monitoring"], "workload": 'loki-stack-grafana', "port_forwards": '3200:3000' if g["REMOTE"] else '3000', "objects": [
			"loki-stack-grafana:serviceaccount",
			"loki-stack-grafana:secret",
			"loki-stack-grafana:role",
			"loki-stack-grafana:rolebinding",
			"loki-stack-grafana:configmap",
			"loki-stack-grafana-clusterrolebinding:clusterrolebinding",
			"loki-stack-grafana-clusterrole:clusterrole",
		]},
		{"labels": ["monitoring"], "workload": 'loki-stack-kube-state-metrics', "objects": [
			"loki-stack-kube-state-metrics:clusterrole",
			"loki-stack-kube-state-metrics:clusterrolebinding",
			"loki-stack-kube-state-metrics:serviceaccount",
		]},
		{"labels": ["monitoring"], "workload": 'loki-stack-promtail', "objects": [
			"loki-stack-promtail:clusterrolebinding",
			"loki-stack-promtail:secret",
			"loki-stack-promtail:clusterrole",
			"loki-stack-promtail:serviceaccount",
		]},
		{"labels": ["monitoring"], "workload": 'loki-stack-prometheus-node-exporter', "objects": [
			"loki-stack-prometheus-node-exporter:serviceaccount",
		]},
		# {"labels": ["monitoring"], "workload": 'loki-stack-prometheus-alertmanager', "objects": [
		# 	"loki-stack-prometheus-alertmanager:configmap",
		# 	"loki-stack-prometheus-alertmanager:clusterrolebinding",
		# 	"loki-stack-prometheus-alertmanager:clusterrole",
		# 	"loki-stack-prometheus-alertmanager:serviceaccount",
		# ]},
		{"labels": ["monitoring"], "workload": 'loki-stack-alertmanager', "objects": [
			"loki-stack-alertmanager:configmap",
			"loki-stack-alertmanager:serviceaccount",
		]},
		{"labels": ["monitoring"], "workload": 'loki-stack-prometheus-pushgateway', "objects": [
			# "loki-stack-prometheus-pushgateway:clusterrolebinding",
			# "loki-stack-prometheus-pushgateway:clusterrole",
			"loki-stack-prometheus-pushgateway:serviceaccount",
		]},
		{"labels": ["monitoring"], "workload": 'loki-stack-prometheus-server', "objects": [
			"loki-stack-prometheus-server:configmap",
			"loki-stack-prometheus-server:clusterrolebinding",
			"loki-stack-prometheus-server:serviceaccount",
			"loki-stack-prometheus-server:clusterrole",
		]},
	])
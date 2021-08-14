# CoreOS Prometheus

This extension deploys CoreOS Prometheus to a monitoring namespace with some modifications to the defaults to enable reading alerts defined via 'PrometheusRule' custom resource definitions. This is a modified version of the tilt-extension [here](https://github.com/tilt-dev/tilt-extensions/tree/master/coreos_prometheus). (original version by [Darragh Bailey](https://github.com/electrofelix))

Extension modifications:
* Made the extension cross-platform. (tested on Windows, but should work on Linux/Mac as well)
* Made-so the version of `kube-prometheus` in `Packages/deploy/Monitors/kube-prometheus/base` is used. (rather than downloaded on first build)
* Added the patches marked with `[new]` below.

Behaviors changed by patches: (patches are at `Packages/deploy/Monitors/kube-prometheus/overlay`)
1) Modify cluster role for greater access.
2) Ensure all namespaces are scanned for alerts.
3) [new] Made-so the `prometheus-k8s` service does not proxy requests to its pods; rather, it's a "headless service", where the requests go directly/unchanged to a random pod. (grafana wasn't able to connect until I did this; not sure why)

## Usage

Basic usage
```
load(
    'ext://coreos_prometheus',
    'setup_monitoring',
    'get_prometheus_resources',
    'get_prometheus_dependencies',
)

setup_monitoring()

k8s_yaml(my_deployment)
k8s_resource(
    'my-resource',
    objects=get_prometheus_resources(my_deployment, 'my-resource')
    resource_deps=get_prometheus_dependencies(),
)
```

This will ensure your service along with any components of your service that depend on prometheus are deployed after the prometheus CRDs have been created.

For example if you have yaml defining 'PrometheusRule' and 'ServiceMonitor' components these will be grouped with your 'my-resource' and applied after the 'prometheus-crds' resources are ready.
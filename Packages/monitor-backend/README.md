# Debate Map (package: monitor-backend)

Backend code for `monitor.debatemap.app`, which is meant for admin-related functionality, and has several unique design goals (see below).

## Design goals

* 1\) Don't provide functionality that many regular users will want to access. (these should be provided by, eg. `app-server`)
* 2\) Don't provide functionality that other pods will want to rely on. (in rare cases where another pod might query `monitor-backend`, it should only be for small/non-essential reasons)
* 3\) It should continue to function regardless of failures in any of the other pods. This means:
	* 3.1\) It should have an independent storage system, running "in pod", with its own k8s persistent-volume-claim.
	* 3.2\) Its frontend code (see [monitor-client](https://github.com/debate-map/app/tree/master/Packages/monitor-client)) should be served from the same pod; ie. `monitor-backend` is both the web-server and app-server for the `monitor.debatemap.app` endpoint. (having a separate web-server pod isn't helpful here, since the user count is very limited, so the caching/scaling requirements don't differ significantly)
	* 3.3\) For accessing "shared functionality" provided by other pods (eg. data from a third-party logging/monitoring tool), such access should always be done in a manner which handles failures gracefully.
* 4\) The storage that `monitor-backend` uses, and the format it uses to communicate with its frontend, should be considered transient (ie. "nukeable").
	* 4.1\) That is, no one should rely on these things remaining the same between commits.
	* 4.2\) The monitoring endpoint should, however, provide an easy way for admins to download full backups of the pod's data at any point, onto their local file-systems.
	* 4.3\) Rationale: If the `monitor-backend` pod ever fails to start or has issues, we want to be able to restore it to a working state simply by "nuking" its storage, and deploying arbitrary changes to the data collected (and transmitted to the `monitor-client` frontend) as needed. This is important for retaining the ability to gather new information, and react quickly, in the case of some urgent crisis besieging the rest of the kubernetes cluster.
# if this chaining system is insufficient to yield reliable/deterministic cluster-initializations, then try adding (or possibly even replacing it with): update_settings(max_parallel_updates=1)

#appliedResourceNames_batches = []
def GetLastResourceNamesBatch(g):
	return g["appliedResourceNames_batches"][-1] if len(g["appliedResourceNames_batches"]) > 0 else []
def AddResourceNamesBatch_IfValid(g, namesBatch):
	if len(namesBatch) > 0:
		g["appliedResourceNames_batches"].append(namesBatch)

def NEXT_k8s_resource(g, workload = '', **args):
	entry = args
	entry["workload"] = workload
	results = NEXT_k8s_resource_batch(g, [
		entry
	])
	return results[0]
def NEXT_k8s_resource_batch(g, entries = []):
	resource_deps = GetLastResourceNamesBatch(g)
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
	AddResourceNamesBatch_IfValid(g, batch_resourceNames)
	
	return results

def k8s_yaml_grouped(g, pathOrBlob, groupName, resourcesToIgnore = []):
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
				resource_deps=GetLastResourceNamesBatch(g),
				labels=[groupName]
			)

	AddResourceNamesBatch_IfValid(g, group_finalResourceNames)

def CreateNamespace(g, k8s_yaml, name, create_resource = True):
	CreateNamespaces(g, k8s_yaml, [name], create_resource)
def CreateNamespaces(g, k8s_yaml, names, create_resource = True):
	yaml_str = ""
	objects_list = []

	# Bug: Namespace is not deployed (reliably anyway) when creating multiple namespaces in one call.
	# Not sure if the bug is just for namespace-deployment in general; even if so though, having the calls separate makes sense for easier debugging/resolution.
	if len(names) > 1:
		fail("Creating multiple namespaces within one CreateNamespaces call is disabled atm (see comment in K8sUtils.rs for more info); once fixed, can remove this block.")

	for name in names:
		if len(yaml_str) > 0:
			yaml_str += "\n---\n"
		yaml_str += '''
apiVersion: v1
kind: Namespace
metadata:
  name: ''' + name
	objects_list.append(name + ":namespace")

	k8s_yaml(blob(yaml_str))
	if create_resource:
		NEXT_k8s_resource(g, new_name="ns_" + "_".join(names),
			labels=["namespaces_DO-NOT-RESTART-THESE"],
			objects=objects_list,
		)
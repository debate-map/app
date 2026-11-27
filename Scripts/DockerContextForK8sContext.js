// @ts-check
const child_process = require("child_process");
const paths = require("path");

/** @typedef {{name: string, dockerEndpoint: string}} DockerContextInfo */

/**
 * Returns the docker-cli environment with docker-targeting overrides removed,
 * so that our queries reflect the registered contexts themselves (rather than the ambient overrides).
 */
function GetCleanEnv() {
	const env = {...process.env};
	delete env.DOCKER_HOST;
	delete env.DOCKER_CONTEXT;
	return env;
}

/** @returns {DockerContextInfo[]} */
function GetDockerContexts() {
	let output;
	try {
		output = child_process.execSync(`docker context ls --format "{{json .}}"`, {env: GetCleanEnv(), stdio: ["ignore", "pipe", "ignore"]}).toString().trim();
	} catch {
		return [];
	}
	if (output == "") return [];

	try {
		return output.split("\n").map(line=>{
			const info = JSON.parse(line);
			return {name: info.Name ?? null, dockerEndpoint: info.DockerEndpoint ?? null};
		}).filter(a=>a.name != null && a.dockerEndpoint != null && a.dockerEndpoint != "");
	} catch {
		// docker printed something unexpected (eg. a warning mixed in with the JSON); better to leave the docker settings alone than to guess
		return [];
	}
}

const reachabilityCache = new Map();
/** Checks whether the docker daemon for the given context is actually running/reachable. */
function IsDockerContextReachable(name) {
	if (reachabilityCache.has(name)) return reachabilityCache.get(name);

	let result = false;
	try {
		child_process.execSync(`docker --context "${name}" version --format "{{.Server.Version}}"`, {env: GetCleanEnv(), stdio: ["ignore", "ignore", "ignore"], timeout: 5000});
		result = true;
	} catch {}
	reachabilityCache.set(name, result);
	return result;
}

/** Gets the k8s cluster (from the kubeconfig) that the given k8s context points to, eg. "dm-local" -> "rancher-desktop". */
function GetK8sClusterName(k8sContextName) {
	try {
		const configStr = child_process.execSync(`kubectl config view -o json`, {stdio: ["ignore", "pipe", "ignore"]}).toString();
		const config = JSON.parse(configStr);
		return config.contexts?.find(a=>a.name == k8sContextName)?.context?.cluster ?? null;
	} catch {
		return null;
	}
}

function GetCurrentDockerContextName() {
	try {
		return child_process.execSync(`docker context show`, {env: GetCleanEnv(), stdio: ["ignore", "pipe", "ignore"]}).toString().trim();
	} catch {
		return null;
	}
}

/**
 * Gets the UIDs of the targeted cluster's pods, ordered with Running pods first (most stable evidence), then the other
 * phases (failed/succeeded/pending pods still have containers in the daemon, which matters eg. when every pod is stuck
 * in a crash-loop/backoff state).
 */
function GetK8sPodUids(k8sContextName) {
	const runningUids = [];
	const otherUids = [];
	// "-A" covers restricted setups too (eg. if kube-system pods are not visible); the namespace-specific queries are fallbacks for RBAC-restricted kubeconfigs
	for (const namespaceArg of ["-A", "-n kube-system", "-n default"]) {
		let output;
		try {
			output = child_process.execSync(`kubectl --context "${k8sContextName}" get pods ${namespaceArg} -o custom-columns=PHASE:.status.phase,UID:.metadata.uid --no-headers --request-timeout=15s`, {stdio: ["ignore", "pipe", "ignore"]}).toString();
		} catch {
			continue;
		}
		for (const line of output.split("\n")) {
			const [phase, uid] = line.trim().split(/\s+/);
			if (uid == null || uid == "") continue;
			(phase == "Running" ? runningUids : otherUids).push(uid);
		}
		if (runningUids.length > 0 || otherUids.length > 0) break;
	}
	return [...new Set([...runningUids, ...otherUids])];
}

const probeCache = new Map();
/**
 * Checks whether the given docker daemon is the container-runtime backing the targeted k8s cluster,
 * by looking for containers that are labeled with any of that cluster's pod UIDs.
 */
function DoesDockerContextServeK8sContext(dockerContextName, k8sPodUids) {
	return k8sPodUids.some(podUid=>DoesDockerContextHaveContainerForPodUid(dockerContextName, podUid));
}

/** Checks whether the given docker daemon has any container (including exited ones) for the given pod UID. */
function DoesDockerContextHaveContainerForPodUid(dockerContextName, podUid) {
	const probeCacheKey = `${dockerContextName}|${podUid}`;
	if (probeCache.has(probeCacheKey)) return probeCache.get(probeCacheKey);

	let result = false;
	try {
		// the labels string is used as a fallback, in case the ".ID" field is unavailable for some container/api version (which makes templating fail)
		for (const format of ["{{.ID}}", "{{json .Labels}}"]) {
			const output = child_process.execSync(`docker --context "${dockerContextName}" ps -a --filter "label=io.kubernetes.pod.uid=${podUid}" --format "${format}"`, {env: GetCleanEnv(), stdio: ["ignore", "pipe", "ignore"], timeout: 5000}).toString().trim();
			if (output != "") {
				result = true;
				break;
			}
		}
	} catch {}
	probeCache.set(probeCacheKey, result);
	return result;
}

/**
 * Asks the user a question and returns their answer. Runs in a child process so that the read is synchronous for the caller.
 * Returns "" if stdin is not interactive (eg. CI); callers should then use their default action.
 * Returns null if the user cancelled (pressed Ctrl+C), in which case the caller should abort the whole run.
 */
function AskChoice(question) {
	if (process.stdin.isTTY !== true) return "";
	try {
		const result = child_process.spawnSync(process.execPath, [paths.join(__dirname, "AskChoice.js"), question], {
			stdio: ["inherit", "pipe", "inherit"], // stdin inherited (so the prompt can read it), stdout piped (to capture the answer), stderr inherited (so the prompt is visible)
			encoding: "utf8",
		});

		const stdout = result.stdout ?? "";
		// an interrupted/closed prompt (eg. Ctrl+C) reports an explicit marker, or dies via signal/status; treat all of those as a cancellation
		const cancelled = stdout.includes("ANSWER_CANCELLED") || stdout.includes("ANSWER_EOF")
			|| result.signal != null || result.status == 130 || result.status == 3221225786 || result.status == -1073741510; // last two are STATUS_CONTROL_C_EXIT (0xC000013A)
		if (cancelled) return null;

		const match = stdout.match(/ANSWER:(.*)/);
		return match != null ? match[1] : "";
	} catch {
		return "";
	}
}

/** Aborts the whole npm script run after the user cancels a prompt. (process.exit is used because the caller only builds a command string.) */
function ExitCancelled() {
	console.log("[docker-context] Cancelled.");
	process.exit(130);
}

/** Normalizes a prompt answer; returns "choose-first" when the user just pressed Enter (or input was unavailable). */
function InterpretAnswer(answer) {
	const text = answer.trim().toLowerCase();
	if (text == "" || text == "1" || text == "y" || text == "yes" || text == "fix") return "choose-first";
	if (text == "2" || text == "n" || text == "no" || text == "proceed") return "proceed-current";
	return "choose-first";
}

/**
 * Three-way prompt: [Enter]=use the detected context for this command, [2]=proceed with the active context, [Ctrl+C]=cancel.
 * Returns "detected", "current", or null (cancelled).
 */
function AskWhichDockerContext(detectedContext, currentContext) {
	const answerRaw = AskChoice(`[docker-context] Use "${detectedContext.name}" for this command? [Enter]=yes, [2]=proceed with "${currentContext.name}", [Ctrl+C]=cancel`);
	if (answerRaw == null) return null;
	if (InterpretAnswer(answerRaw) == "proceed-current") return "current";
	return "detected";
}

/**
 * Searches (only when asked) for the docker daemon that backs the given k8s context, and returns its endpoint
 * (eg. "npipe:////./pipe/docker_engine"), for use as the DOCKER_HOST env-var of a single command (eg. "tilt up --context dm-local").
 *
 * Order/method is deliberately conservative:
 * 1. First, only the *currently-active* docker context is checked (does its daemon have containers for this cluster's pods?).
 *    If yes, the search is done, with no other daemon touched.
 * 2. If not, then the other docker context names are checked against the k8s cluster/context name (no daemon access needed beyond a reachability check).
 * 3. If that also finds nothing, the user is asked whether to scan the remaining docker daemons (the only step that touches engines other than the active one).
 *
 * Returns null when the caller should leave the docker connection settings unchanged (ie. use the current context).
 */
function SearchForDockerHostForK8sContext(k8sContextName) {
	if (k8sContextName == null || k8sContextName == "") return null;

	const dockerContexts = GetDockerContexts();
	const clusterName = GetK8sClusterName(k8sContextName);
	const currentContext = dockerContexts.find(a=>a.name == GetCurrentDockerContextName()) ?? null;
	const clusterStr = clusterName != null ? ` (cluster "${clusterName}")` : "";
	const k8sPodUids = GetK8sPodUids(k8sContextName);
	const probeUids = k8sPodUids.slice(0, 6); // a few candidates suffice (and avoids scanning forever when the clusters don't match)
	const currentContextReachable = currentContext != null && IsDockerContextReachable(currentContext.name);

	// 1) fast path: check only the active docker context (the standard workflow: the dev already targeted the right context)
	if (currentContextReachable && DoesDockerContextServeK8sContext(currentContext.name, probeUids)) {
		console.log(`[docker-context] Active docker context "${currentContext.name}" is correct (has pod-uid match) for k8s context "${k8sContextName}"${clusterStr}; leaving the docker connection settings unchanged.`);
		return null;
	}

	// 2) name matching (eg. a "rancher-desktop" docker context for the "rancher-desktop" k8s cluster); only requires a reachability check, not a daemon scan
	let nameMatchedContext = null;
	for (const candidateName of [clusterName, k8sContextName]) {
		if (candidateName == null) continue;
		nameMatchedContext = dockerContexts.find(a=>a.name == candidateName && IsDockerContextReachable(a.name)) ?? null;
		if (nameMatchedContext != null) break;
	}
	if (nameMatchedContext != null) {
		if (currentContext == null || nameMatchedContext.name == currentContext.name || nameMatchedContext.dockerEndpoint == currentContext.dockerEndpoint) {
			console.log(`[docker-context] Active docker context "${currentContext?.name ?? "(none)"}" already targets the docker daemon backing k8s context "${k8sContextName}"${clusterStr}; leaving the docker connection settings unchanged.`);
			return null;
		}

		const choice = AskWhichDockerContext(nameMatchedContext, currentContext);
		if (choice == null) ExitCancelled();
		if (choice == "current") {
			console.log(`[docker-context] Proceeding with the active docker context "${currentContext.name}".`);
			return null;
		}
		console.log(`[docker-context] Using docker context "${nameMatchedContext.name}" (${nameMatchedContext.dockerEndpoint}) for this command only -- matched by name (no pod-uid evidence available yet). (To make it permanent: docker context use "${nameMatchedContext.name}")`);
		return nameMatchedContext.dockerEndpoint;
	}

	// 3) no evidence that the active context is correct: ask before scanning the other daemons (the only step that touches other engines)
	const otherContextNames = dockerContexts.map(a=>a.name).filter(a=>currentContext == null || a != currentContext.name);
	const hasOtherContexts = otherContextNames.length > 0;
	let noEvidenceReasonStr = currentContext == null
		? "No docker context is currently selected."
		: !currentContextReachable
			? `The active docker context "${currentContext.name}" is not reachable (is Docker/Rancher Desktop running?).`
			: "The active docker daemon has no containers for this cluster's pods.";
	if (k8sPodUids.length == 0) {
		// this is the other cause of "no evidence", and it can co-occur with an unreachable/mismatched active context
		noEvidenceReasonStr += ` No pods were found in the cluster${currentContextReachable ? "" : " either"}, which can happen on a first local deploy -- in which case there is not yet any container-level evidence of which daemon should serve it.`;
	} else if (currentContextReachable) {
		noEvidenceReasonStr += ` (If the cluster uses containerd rather than docker, then no docker daemon will have its containers.)`;
	}

	console.log(`
[docker-context] Did not find evidence that the active docker context is the one backing k8s context "${k8sContextName}"${clusterStr}.
[docker-context]   currently active: "${currentContext?.name ?? "(none)"}" (${currentContext?.dockerEndpoint ?? "(none)"})
[docker-context] ${noEvidenceReasonStr}`);
	if (!hasOtherContexts) console.log(`[docker-context]   (No other docker contexts are registered either.)`);

	let choice;
	if (hasOtherContexts) {
		const answerRaw = AskChoice(`[docker-context] Search the other docker contexts ("${otherContextNames.join(`", "`)}") for a match (by pod-uids)? [Enter]=yes, [2]=use active context "${currentContext?.name ?? "(none)"}", [Ctrl+C]=cancel`);
		if (answerRaw == null) ExitCancelled();
		choice = InterpretAnswer(answerRaw) == "proceed-current" ? "current" : "search";
	} else {
		if (AskChoice(`[docker-context] Proceed with the active docker context "${currentContext?.name ?? "(none)"}"? [Enter]=yes, [Ctrl+C]=cancel`) == null) ExitCancelled();
		choice = "current";
	}

	if (choice == "search") {
		for (const context of dockerContexts) {
			if (currentContext != null && context.name == currentContext.name) continue; // already checked in step 1
			if (!IsDockerContextReachable(context.name)) continue;
			if (DoesDockerContextServeK8sContext(context.name, probeUids)) {
				console.log(`[docker-context] Found it (by pod-uid match): docker context "${context.name}" (${context.dockerEndpoint}). Using it for this command only. (To make it permanent: docker context use "${context.name}")`);
				return context.dockerEndpoint;
			}
		}

		// the search was fruitless: let the user decide whether to fall back to the active context (or fix things and retry)
		console.log(`[docker-context] Searched the other docker contexts, but none of them have containers for this cluster's pods.`);
		if (currentContext != null) {
			if (AskChoice(`[docker-context] Proceed with the active docker context "${currentContext.name}" anyway? [Enter]=yes, [Ctrl+C]=cancel (to fix things manually, then retry)`) == null) ExitCancelled();
		}
	}

	// 4) use the active context as-is
	if (currentContext == null) {
		console.log(`[docker-context] No active docker context was found; leaving the docker connection settings unchanged.`);
	} else {
		console.log(`[docker-context] Proceeding with the active docker context "${currentContext.name}".`);
	}
	return null;
}
exports.SearchForDockerHostForK8sContext = SearchForDockerHostForK8sContext;

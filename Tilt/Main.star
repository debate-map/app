# tilt config
# ==========

# allow using tilt to also push to the remote OVHcloud k8s cluster
allow_k8s_contexts('ovh')

# tilt config settings
# For now, we just completely disable tilt's docker-prune behavior (doing so fixes issue #169); there might be a better solution, but this is fine for now.
# To keep tilt's image-generation from taking up too much space, you can manually do docker-prunes when docker's image-storage grows too large, eg:
# 1) Prune all: `docker builder prune`
# 2) Prune build-cache (largest single layer, but also useful to keep): `docker builder prune --filter type=exec.cachemount`
# 3) Prune non-build-cache (recommended; though should be modified to exclude rust-base image; also not yet tested): `docker builder prune --filter type!=exec.cachemount`
docker_prune_settings(disable=True)

# Trying with docker-prune enabled, but with no max-age -- relying only on `keep_recent` count. (to be seen if this preserves what's needed for fast recompiles)
# [Update: Didn't work; still cleared basically all build-cache, from 185gb to <1gb, when should have left at least ~4.5gb for cargo build-cache.]
# For reference, here is the source-code of tilt's docker-prune function: https://github.com/tilt-dev/tilt/blob/4c8b561077f95316fe2a2a3ee27db8b0edba057d/internal/engine/dockerprune/docker_pruner.go#L137
#docker_prune_settings(max_age_mins = 999888777666555, keep_recent = 2)

# util imports
# ==========

# other tilt extensions
load('ext://helm_remote', 'helm_remote')
load('ext://helm_resource', 'helm_resource', 'helm_repo')

# custom tilt files
load('./Utils.star', 'ReplaceInBlob', 'ReadFileWithReplacements', 'ModifyLineRange', 'Base64Encode', 'GetDateTime')
load('./K8sUtils.star', 'NEXT_k8s_resource', 'GetLastResourceNamesBatch', 'AddResourceNamesBatch_IfValid', 'NEXT_k8s_resource_batch', 'k8s_yaml_grouped', 'CreateNamespace', 'CreateNamespaces')

# customize handling of Tiltfile args (ie. the args after the "--" in launch-command, or the unnamed args at end if no "--" is present)
# ==========

config.define_string_list("to-run", args=True) # args=True means we take the unnamed list of args at the end of the command as this config-entry's value
config.define_bool("compileWithCranelift")
config.define_bool("compileWithRelease")
cfg = config.parse()
config.set_enabled_resources(cfg.get("to-run", []))

# generate globals
# ==========

#print("Env vars:", os.environ)
load('ext://dotenv', 'dotenv')
dotenv(fn="../.env")
#print("Env vars after loading from .env file:", os.environ)
launchArgs = sys.argv
print("Tilt launch args:", launchArgs)

ENV = os.getenv("ENV")
DEV = ENV == "dev"
PROD = ENV == "prod"
print("Env:", ENV)

CONTEXT = os.getenv("CONTEXT")
REMOTE = CONTEXT != "local"
print("Context:", CONTEXT, "Remote:", REMOTE)

pulumiOutput = decode_json(str(read_file("../PulumiOutput_Public.json")))
registryURL = pulumiOutput["registryURL"]
bucket_uniformPrivate_url = pulumiOutput["bucket_prod_uniformPrivate_url" if PROD else "bucket_dev_uniformPrivate_url"]
bucket_uniformPrivate_name = pulumiOutput["bucket_prod_uniformPrivate_name" if PROD else "bucket_dev_uniformPrivate_name"]

# tracking of tiltfile runs
timeOfThisTiltfileUpdate = GetDateTime()
if os.getenv("TIME_OF_TILT_UP_COMMAND") == None:
	os.putenv("TIME_OF_TILT_UP_COMMAND", timeOfThisTiltfileUpdate)
timeOfTiltUpCommand = os.getenv("TIME_OF_TILT_UP_COMMAND")

compileWithCranelift = cfg.get("compileWithCranelift", False)
compileWithRelease = cfg.get("compileWithRelease", PROD) # default to compiling: PROD -> release, DEV (or others) -> debug

g = {
	"appliedResourceNames_batches": [],
	"ENV": ENV,
	"DEV": DEV,
	"PROD": PROD,
	"CONTEXT": CONTEXT,
	"REMOTE": REMOTE,
	"registryURL": registryURL,
	"bucket_uniformPrivate_url": bucket_uniformPrivate_url,
	"bucket_uniformPrivate_name": bucket_uniformPrivate_name,
	"timeOfThisTiltfileUpdate": timeOfThisTiltfileUpdate,
	"timeOfTiltUpCommand": timeOfTiltUpCommand,
	"compileWithCranelift": compileWithCranelift,
	"compileWithRelease": compileWithRelease,
}

# start specifying resources (to be deployed to k8s soon)
# ==========

# namespaces
CreateNamespaces(g, k8s_yaml, [
	"app",
	#"gateway-system", # namespace added in Gateway.star
	#"monitoring", # used by Traefik_Gateway.star and Monitoring.star
])
CreateNamespace(g, k8s_yaml, "monitoring") # used by Traefik_Gateway.star and Monitoring.star (using separate call atm, to avoid bug in CreateNamespaces)
# empty namespaces, created just to be used as a target for the required "objects=[...]" fields, for Tilt new-resources (which only have pod-selectors, not an objects list)
CreateNamespaces(g, k8s_yaml, [
	"empty1",
], create_resource=False)

# others (early)
k8s_yaml('../Packages/deploy/NodeSetup/node-setup-daemon-set.yaml')
# since node-setup pod sleeps forever after running (causing readiness checks to fail/never-return... I think), don't wait for those readiness-checks to succeed
NEXT_k8s_resource(g, "node-setup", pod_readiness='ignore')

# metrics-server (already present on OVH, but lacking in docker-desktop; added for convenience, eg. seeing memory usage of pods easily using `kubectl top`)
if not REMOTE:
	k8s_yaml('../Packages/deploy/Monitors/metrics-server/components.yaml')
	NEXT_k8s_resource(g, "metrics-server", labels=["monitoring"], pod_readiness='ignore')

# secrets-reflector
load('./Reflector.star', 'Start_Reflector')
Start_Reflector(g)

# postgres
load('./Postgres.star', 'Start_Postgres')
Start_Postgres(g)

# load-balancer/reverse-proxy (traefik, ingress-based [old])
# load('./Traefik_Ingress.star', 'Start_TraefikIngress')
# Start_TraefikIngress(g)

# load-balancer/reverse-proxy (traefik, gateway-based [new])
load('./Traefik_Gateway.star', 'Start_TraefikGateway')
Start_TraefikGateway(g)

# cert-manager (for creating/renewing SSL certificates)
load('./CertManager.star', 'Start_CertManager')
Start_CertManager(g)

# own app (docker build and such)
load('./App.star', 'Start_App')
Start_App(g)

# monitoring
load('./Monitoring.star', 'Start_Monitoring')
Start_Monitoring(g)

# extras
# ==========

# this is just for developer convenience, eg. for referencing to see when they last updated the remote k8s cluster
local(["node", "../Scripts/RecordTiltfileRun.js", ENV])
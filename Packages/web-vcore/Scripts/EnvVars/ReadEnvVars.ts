const processEnv = globalThis?.process?.env ?? {};

// handling for "ENV"/"NODE_ENV" variables
// ==========

function ReadShortEnv(envStr) {
	if (envStr == null) return null;
	if (envStr == "dev" || envStr == "prod") return envStr;
	throw new Error(`The "ENV" environment-variable should be set to "dev" or "prod", not "${envStr}".`);
}
// by convention, NODE_ENV uses full-name, so convert to short-name
function ReadLongEnv(envStr) {
	if (envStr == null) return null;
	if (envStr == "development") return "dev";
	if (envStr == "production") return "prod";
	throw new Error(`The "NODE_ENV" environment-variable should be set to "development" or "production", not "${envStr}".`);
}
function ShortEnvToLongEnv(env_short: string) {
	if (env_short == null) return null;
	if (env_short == "dev") return "development";
	if (env_short == "prod") return "production";
	throw new Error(`Invalid short-env: "${env_short}". Should be "dev" or "prod".`);
}

const env_short = ReadShortEnv(processEnv.ENV) ?? ReadLongEnv(processEnv.NODE_ENV);

export const ENV = env_short;
export const ENV_Long = ()=>ShortEnvToLongEnv(env_short);
export const DEV = env_short == "dev";
export const PROD = env_short == "prod";
export const TEST = env_short == "test";

// handling for other variables
// ==========

export const QUICK = process.env.QUICK;
export const USE_TSLOADER = process.env.USE_TSLOADER;
export const OUTPUT_STATS = process.env.OUTPUT_STATS;
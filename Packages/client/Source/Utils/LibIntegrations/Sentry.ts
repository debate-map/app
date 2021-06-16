import Raven from "web-vcore/nm/raven-js";
import {version} from "Main";

export function InitSentry() {
	if (PROD && window.location.hostname != "localhost") { // if localhost, never enable Raven (even if env-override is set to production)
		Raven.config("https://40c1e4f57e8b4bbeb1e5b0cf11abf9e9@sentry.io/155432", {
			release: version,
			environment: ENV,
		}).install();
	}
}
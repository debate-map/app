import {Assert, IsString} from "js-vextensions";
import {wrr} from "webpack-runtime-require";

export function ExposeModuleExports() {
	wrr.ParseModuleData(true);

	// this structure seems more complicated than necessary; will clean up later
	G({
		R: wrr.moduleExports,
		RR: wrr.moduleExports_flat,
		RE: wrr.Require,
	});

	return wrr;
}
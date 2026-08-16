// Build the icon `<symbol>` sprite ourselves, from the raw svg source-text of each file in "Resources/SVGs".
// (rspack is configured -- see `rspack.js` -- to load `.svg` files as `asset/source`, ie. as raw strings)
// This replaces the old `svg-sprite-loader`, which is incompatible with rspack 2.x (it calls `ModuleGraph.getIssuer()`
// during the module-build phase, making every `.svg` module fail to build.
// The consumer is web-vcore's `Icon.tsx`, which needs `manager.iconInfo["./<name>.svg"] == {id, viewBox}`, and renders
// `<svg viewBox={info.viewBox}><use xlinkHref={"#" + info.id}/></svg>` -- so a matching `<symbol id={info.id}>` must
// also exist in the document.

export function InjectSVGsFromRequireContextAndGetIconInfo(context: any) {
	const iconInfo = {} as {[key: string]: {id: string, viewBox: string}};

	const iconSymbols = [] as string[];
	for (const filename of context.keys() as string[]) {
		const raw = context(filename);
		// just play it safe and grab the source-string from whatever module-exports shape is observed
		const svgText = typeof raw == "string" ? raw : raw.default as string;

		// derive a dom-id from the filename (eg. "./arrow-down.svg" -> "arrow-down")
		const id = filename.replace(/^.*\//, "").replace(/\.svg$/, "");

		// extract the attributes of the outermost `<svg>` tag, plus its inner content
		const svgTagMatch = svgText.match(/<svg\b([^>]*)>([\s\S]*)<\/svg\s*>/);
		if (svgTagMatch == null) {
			console.error(`Could not parse svg file "${filename}"; skipping it. (its <svg> root element was not found)`);
			continue;
		}
		const [, svgAttrsStr, svgContent] = svgTagMatch;

		// prefer the file's own view-box; if absent (eg. Star.svg), synthesize one from its width/height attributes
		const GetAttr = (attrName: string)=>svgAttrsStr.match(new RegExp(`\\b${attrName}\\s*=\\s*"([^"]*)"`, "i"))?.[1];
		let viewBox = GetAttr("viewBox");
		if (viewBox == null) {
			const width = GetAttr("width");
			const height = GetAttr("height");
			if (width == null || height == null) {
				console.error(`Could not determine a view-box for svg file "${filename}"; skipping it. (it has neither a "viewBox" attribute, nor both "width" and "height" attributes)`);
				continue;
			}
			viewBox = `0 0 ${parseFloat(width)} ${parseFloat(height)}`;
		}

		iconInfo[filename] = {id, viewBox};
		iconSymbols.push(`<symbol id="${id}" viewBox="${viewBox}">${svgContent}</symbol>`);
	}

	// inject the assembled symbols into a single hidden <svg> element in the document (the `<use xlinkHref="#id">`
	// references in web-vcore's `Icon.tsx` resolve against these)
	function AddIconSpriteToDocument() {
		const spriteHolder = document.createElement("div");
		spriteHolder.id = "icon-sprite";
		// hide it, but NOT with `display: none` (that prevents `<use>` references from resolving in some browsers)
		spriteHolder.setAttribute("aria-hidden", "true");
		spriteHolder.style.position = "absolute";
		spriteHolder.style.width = "0";
		spriteHolder.style.height = "0";
		spriteHolder.style.overflow = "hidden";
		spriteHolder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${iconSymbols.join("")}</svg>`;
		// insert as the first child, so the symbols are defined before any icon that references them
		document.body.insertBefore(spriteHolder, document.body.firstChild);
	}
	// (the bundle's script-tag is injected at the end of <body>, so document.body normally exists already; the
	// readystate branch is just a safety-net, eg. in case the script ends up in <head> at some point)
	if (typeof document != "undefined" && iconSymbols.length > 0) {
		if (document.body != null) AddIconSpriteToDocument();
		else document.addEventListener("DOMContentLoaded", ()=>AddIconSpriteToDocument());
	}

	return iconInfo;
}
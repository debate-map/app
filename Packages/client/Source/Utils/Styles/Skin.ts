import chroma from "web-vcore/nm/chroma-js.js";

// add as global, so one can easily test out new colors using the browser dev-tools
globalThis.chroma = chroma;

export abstract class Skin {
	abstract MainBackgroundColor(): chroma.Color;
	abstract HeaderFont(): string;
	abstract MainFont(): string;
	abstract TextColor(): string;

	// possible style overrides
	FreeformStyleSection = ()=>"";
	ButtonStyleOverrides = ()=>"";
}
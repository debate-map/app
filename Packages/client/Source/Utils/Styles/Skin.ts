import chroma from "web-vcore/nm/chroma-js.js";

// add as global, so one can easily test out new colors using the browser dev-tools
globalThis.chroma = chroma;

export abstract class Skin {
	// scalars 
	abstract MainBackgroundColor(): chroma.Color;
	abstract HeaderFont(): string;
	abstract MainFont(): string;
	abstract TextColor(): string;
	abstract NavBarTextColor(): string;
	abstract NavBarBoxShadow(): string;

	// styles
	abstract Style_Page(): Object;
	abstract Style_VMenuItem(): Object;
	abstract Style_FillParent(): Object;
	abstract Style_XButton(): Object;

	// style overrides and blocks (defaulting to "", since they're fine to leave empty)
	StyleOverride_Button = ()=>"";
	StyleBlock_Freeform = ()=>"";
}
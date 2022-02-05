import chroma from "web-vcore/nm/chroma-js.js";

// add as global, so one can easily test out new colors using the browser dev-tools
globalThis.chroma = chroma;

export abstract class Skin {
	// scalars 
	abstract BasePanelBackgroundColor(): chroma.Color; // for panels expected to not have content behind them
	abstract OverlayPanelBackgroundColor(): chroma.Color; // for panels expected to have content behind them
	abstract HeaderFont(): string;
	abstract MainFont(): string;
	abstract TextColor(): string;
	abstract NavBarBoxShadow(): string; // temp (until NavBar is moved to web-vcore)

	// styles
	abstract Style_Page(): Object;
	abstract Style_VMenuItem(): Object;
	abstract Style_FillParent(): Object;
	abstract Style_XButton(): Object;

	// style overrides and blocks (defaulting to "", since they're fine to leave empty)
	StyleOverride_Button = ()=>"";
	StyleBlock_Freeform = ()=>"";
	CSSHooks_Freeform = ()=>{};
}
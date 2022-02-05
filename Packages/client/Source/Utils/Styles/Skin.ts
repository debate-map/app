import chroma from "web-vcore/nm/chroma-js.js";

// add as global, so one can easily test out new colors using the browser dev-tools
globalThis.chroma = chroma;

export abstract class Skin {
	// scalars 
	abstract BasePanelBackgroundColor(): chroma.Color; // for panels expected to not have content behind them
	abstract BasePanelDropShadowFilter(): string|undefined;
	abstract OverlayPanelBackgroundColor(): chroma.Color; // for panels expected to have content behind them
	abstract NavBarPanelBackgroundColor(): chroma.Color; // for panels branching off from the nav-bar
	abstract OverlayBorderColor(): chroma.Color|undefined;
	abstract OverlayBorder(): string|undefined;
	abstract HeaderFont(): string;
	abstract MainFont(): string;
	abstract TextColor(): chroma.Color;
	abstract NodeTextColor(): chroma.Color;
	abstract NodeSubPanelBackgroundColor(): chroma.Color;
	abstract NavBarBoxShadow(): string; // temp (until NavBar is moved to web-vcore)
	abstract HeaderColor(): chroma.Color;
	abstract ListEntryBackgroundColor_Light(): chroma.Color;
	abstract ListEntryBackgroundColor_Dark(): chroma.Color;

	// styles
	abstract Style_Page(): Object;
	abstract Style_VMenuItem(): Object;
	abstract Style_FillParent(): Object;
	abstract Style_XButton(): Object;

	// freeform blocks (these have defaults, since they're fine to leave empty)
	StyleBlock_Freeform() {
		return "";
	}
	CSSHooks_Freeform() {}
}
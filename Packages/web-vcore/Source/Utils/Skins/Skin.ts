import chroma from "chroma-js";

// add as global, so one can easily test out new colors using the browser dev-tools
globalThis.chroma = chroma;

export abstract class Skin {
	// scalars
	// ==========

	abstract BasePanelBackgroundColor(): chroma.Color; // for panels expected to not have content behind them
	abstract BasePanelDropShadowFilter(): string|undefined;
	abstract OverlayPanelBackgroundColor(): chroma.Color; // for panels expected to have content behind them
	abstract NavBarPanelBackgroundColor(): chroma.Color; // for panels branching off from the nav-bar
	abstract OverlayBorderColor(): chroma.Color|undefined;
	abstract OverlayBorder(): string|undefined;
	abstract HeaderFont(): string;
	abstract MainFont(): string;
	abstract TextColor(): chroma.Color;
	abstract TextColor_Dark(): chroma.Color;
	abstract TextColor_Light(): chroma.Color;
	//abstract NavBarTextColor(): chroma.Color;
	abstract NavBarBoxShadow(): string; // temp (until NavBar is moved to web-vcore)
	abstract HeaderColor(): chroma.Color;
	abstract ListEntryBackgroundColor_Light(): chroma.Color;
	abstract ListEntryBackgroundColor_Dark(): chroma.Color;

	// styles
	// ==========

	abstract Style_Page(): Object;
	abstract Style_VMenuItem(): Object;
	abstract Style_FillParent(): Object;
	abstract Style_XButton(): Object;

	// blocks of raw-css or hooks/code
	// ==========

	/** Gets the css required to "globally apply" the subset of the skin's "scalars" and "styles" (see above) that do not get "attached per element". */
	abstract RawCSS_ApplyScalarsAndStyles(): string;

	/** Place freeform CSS here. */
	abstract RawCSS_Freeform(): string;

	/** In this function, place calls to "addHook_css" from react-vextensions; this lets you modify "attached" styling on css-hook-compatible react-components (see react-vextensions for more info). */
	abstract CSSHooks_Freeform(): void;

	//abstract WillMount_Freeform(): void;
	//abstract DidMount_Freeform(): void;
}
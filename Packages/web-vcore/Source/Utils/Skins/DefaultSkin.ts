import {addHook_css} from "react-vextensions";
import {Chroma} from "../General/General.js";
import {SubNavBar} from "../UI/SubNavBar.js";
import {Skin} from "./Skin.js";

/*
Why do we use a "Skin" system on top of css, rather than just using css by itself?
Explanation:
1) We want to be able to use "variables", that we define in one place, and which are then used in multiple places.
2) CSS-variables are not ideal, because:
* They don't work for attached-to-element styles.
* Sets of variables (eg. for different skins) are (arguably) harder to "swap between" using code.
* I want a clear boundary between "styles that my projects are likely to customize using skins" versus "styles that are kept the same in pretty much all my projects" (eg. those kept for both "dark" and "light" modes).
3) However, we don't want to get rid of "raw css" entirely, because there would be too many style-blocks that need explicit defining/naming otherwise; a place to throw large amounts of shared css is handy to keep around.
Hence, we end up at a solution that combines the two.
*/

// NOTE: We implement the functions below as regular prototype-bound methods, so that child-classes can simply call super.FuncX()
export class DefaultSkin extends Skin {
	static main = new DefaultSkin();

	// scalars
	// ==========

	override BasePanelBackgroundColor() { return Chroma("rgba(0,0,0,.7)"); }
	override BasePanelDropShadowFilter() { return undefined; }
	override OverlayPanelBackgroundColor() { return Chroma("rgba(0,0,0,.7)"); }
	override NavBarPanelBackgroundColor() { return this.OverlayPanelBackgroundColor(); }
	override OverlayBorderColor() { return undefined; }
	override OverlayBorder() { return undefined; }
	override HeaderFont() { return this.MainFont(); }
	override MainFont() {
		// keep list in-sync with Main.scss
		const fonts = [
			// fonts we supply ourselves (in most projects)
			// ----------
			// "Quicksand" is the standard "main font" for my projects; not all use it atm, but eventually all should converge
			// The font should also be supplied from the web-server (eg. in project Resources/Fonts folder), so it's available for all visitors. (atm, this part is not handled by web-vcore)
			"Quicksand",
			// try to supply common technical symbols, using Symbola font; it's generally not provided by OS, so relies on user-project providing it (eg. in Resources/Fonts folder)
			"Symbola",

			// fallback fonts (for characters not provided by the manually-provided fonts)
			// ----------
			// regular-text fallback-fonts (eg. for projects that aren't yet providing the Quicksand font themselves, that get loaded on devices without the Quicksand font)
			"Roboto", "Open Sans", "Helvetica Neue", "Helvetica", "Arial", "sans-serif",
			// try to supply colored emojis, using some emoji fonts that might be present on OS (otherwise it falls back to non-colored ones for, eg. ✔ and ⚙ -- though not 🚧)
			"Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", "EmojiSymbols", "EmojiOne Mozilla", "TweMoji Mozilla", "Segoe UI Symbol",
		];
		return fonts.join(", ");
	}
	override TextColor() { return this.TextColor_Light(); }
	override TextColor_Dark() { return Chroma("rgb(50,50,50)"); }
	override TextColor_Light() { return Chroma("rgba(255,255,255,.7)"); }
	//override NavBarTextColor() { return "rgb(255,255,255)"; }
	override NavBarBoxShadow() { return "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px"; }
	override HeaderColor() { return this.ListEntryBackgroundColor_Dark(); }
	override ListEntryBackgroundColor_Light() { return Chroma("rgba(30,30,30,.7)"); }
	override ListEntryBackgroundColor_Dark() { return Chroma("rgba(0,0,0,.7)"); }

	// styles
	// ==========

	// fixes that height:100% doesn't work in safari, when in flex container
	override Style_Page() { return ({width: 960, flex: 1, margin: "100px auto", padding: 50, background: "rgba(0,0,0,.75)", borderRadius: 10, cursor: "auto"}); }
	override Style_VMenuItem() { return ({padding: "3px 5px", borderTop: "1px solid rgba(255,255,255,.1)"}); }
	override Style_FillParent() { return ({position: "absolute", left: 0, right: 0, top: 0, bottom: 0}); }
	override Style_XButton() { return ({padding: "5px 10px"}); }

	// blocks of raw-css or hooks/code
	// ==========

	override RawCSS_ApplyScalarsAndStyles() {
		return `
			/* add not-filter, to ensure higher-priority than the early-loading/fallback styles that set the font-family, in Main.scss */
			html, body:not(.neverMatch) {
				font-family: ${this.MainFont()};
				color: ${this.TextColor().css()};
			}
		`;
	}
	/** Place freeform CSS here. Since web-vcore's DefaultSkin class supplies some css here (eg. fixes for subdep styles), a derived-class should include that base-content in its function-override. */
	override RawCSS_Freeform() {
		return `
			/* fixes for subdeps */
			.VMenu > div:first-child { border-top: initial !important; }
		`;
	}
	override CSSHooks_Freeform() {}
}
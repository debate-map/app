import chroma from "web-vcore/nm/chroma-js.js";
import {Skin} from "../Skin.js";
import {DMSkin} from "./DMSkin.js";

export class SLSkin extends Skin {
	static main = new SLSkin();

	// scalars
	// ==========

	MainBackgroundColor = ()=>chroma("rgba(255,255,255,.7)");
	HeaderFont = ()=>"Cinzel";
	//MainFont = ()=>"TypoPRO Bebas Neue";
	MainFont = ()=>"'Quicksand', sans-serif";
	TextColor = ()=>"rgb(43,55,85)";
	NavBarTextColor = ()=>"rgb(0,0,0)";
	NavBarBoxShadow = ()=>DMSkin.main.NavBarBoxShadow();

	// styles
	// ==========

	Style_Page = ()=>DMSkin.main.Style_Page();
	Style_VMenuItem = ()=>DMSkin.main.Style_VMenuItem().Extended({backgroundColor: "rgba(255,255,255,1)"});
	Style_FillParent = ()=>DMSkin.main.Style_FillParent();
	Style_XButton = ()=>DMSkin.main.Style_XButton();

	// style overrides and blocks
	// ==========

	StyleOverride_Button = ()=>`color: ${this.TextColor()} !important;`;
	StyleBlock_Freeform = ()=>`
		.VMenu > div:first-child { border-top: initial !important; }
		.VMenuItem:not(.disabled):not(.neverMatch):hover {
			background-color: rgb(200, 200, 200) !important;
		}

		.ReactModal__Content {
			background-color: rgba(255,255,255,0.75) !important;
		}
		.ReactModal__Content > div:first-child {
			background-color: rgba(255,255,255,1) !important;
		}
		
		.ButtonBar_OptionUI {
			border-width: 1px 0 1px 1px !important;
			border-style: solid !important;
			border-color: rgba(0,0,0,.3) !important;
		}
		.ButtonBar_OptionUI:last-child {
			border-width: 1px 1px 1px 1px !important;
		}

		.dropdown__content:not(.neverMatch) {
			background-color: rgba(255,255,255,1) !important;
			border: 1px solid rgba(0,0,0,.5);
			border-radius: 0 0 5px 5px; /* shouldn't it always be this? */
		}

		.MessageUI, .MessageUI > div {
			background-color: rgba(255,255,255,.9) !important;
		}
		.argumentsControlBar > div:first-child > div {
			color: rgb(199, 202, 209) !important;
		}
	`;
}
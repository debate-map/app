import chroma from "web-vcore/nm/chroma-js.js";
import {Skin} from "../Skin.js";

export class SLSkin extends Skin {
	static main = new SLSkin();

	MainBackgroundColor = ()=>chroma("rgba(255,255,255,.7)");
	HeaderFont = ()=>"Cinzel";
	//MainFont = ()=>"TypoPRO Bebas Neue";
	MainFont = ()=>"'Quicksand', sans-serif";
	TextColor = ()=>"rgb(43,55,85)";

	ButtonStyleOverrides = ()=>`color: ${this.TextColor()} !important;`;

	FreeformStyleSection = ()=>`
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
	`;
}
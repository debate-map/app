import {Skin} from "../Skin.js";

export class SLSkin extends Skin {
	static main = new SLSkin();

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
	`;
}
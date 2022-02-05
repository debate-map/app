import {UserRow} from "UI/Database/Users.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {addHook_css, NavBarButton, Style, SubNavBar, SubNavBarButton} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {Skin} from "../Skin.js";
import {DMSkin} from "./DMSkin.js";

export class SLSkin extends Skin {
	static main = new SLSkin();

	// scalars
	// ==========

	BasePanelBackgroundColor = ()=>chroma("rgba(180,180,180,.7)");
	OverlayPanelBackgroundColor = ()=>chroma("rgba(255,255,255,.7)");
	NavBarPanelBackgroundColor = ()=>this.OverlayPanelBackgroundColor();
	OverlayBorder = ()=>"1px solid rgba(85,85,85,.5)";
	HeaderFont = ()=>"Cinzel";
	//MainFont = ()=>"TypoPRO Bebas Neue";
	MainFont = ()=>"'Quicksand', sans-serif";
	TextColor = ()=>"rgb(43,55,85)";
	NavBarBoxShadow = ()=>DMSkin.main.NavBarBoxShadow();
	HeaderColor = ()=>DMSkin.main.HeaderColor();
	ListEntryBackgroundColor_Light = ()=>DMSkin.main.ListEntryBackgroundColor_Light();
	ListEntryBackgroundColor_Dark = ()=>DMSkin.main.ListEntryBackgroundColor_Dark();

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
		div[data-tip] {
			filter: invert(1);
		}
		.scrollBar {
			filter: invert(1);
		}

		.MessageUI, .MessageUI > div {
			background-color: rgba(255,255,255,.9) !important;
		}
		.argumentsControlBar > div:first-child > div {
			color: rgb(199, 202, 209) !important;
		}
	`;
	CSSHooks_Freeform = ()=>{
		addHook_css(NavBarButton, ctx=>{
			if (ctx.callIndex == 0) {
				ctx.styleArgs.push({
					color: "rgb(0,0,0)",
				});
			}
		});
		addHook_css(SubNavBar, ctx=>{
			if (ctx.key == "root") {
				ctx.styleArgs.push({
					zIndex: zIndexes.navBar,
				});
			} else if (ctx.key == "sub1") {
				ctx.styleArgs.push({
					//background: this.MainBackgroundColor().css(),
					background: "#fff",
					boxShadow: this.NavBarBoxShadow(),
					padding: "0 30px",
					color: "rgb(0,0,0)",
				});
			}
		});
		addHook_css(SubNavBarButton, ctx=>{
			if (ctx.callIndex == 0) {
				ctx.styleArgs.push({
					//background: this.MainBackgroundColor().css(),
					fontFamily: SLSkin.main.HeaderFont(),
					fontSize: 16, textTransform: "uppercase", fontWeight: "normal",
					color: "rgb(0,0,0)",
				});
			}
		});
		/*addHook_css(UserRow, ctx=>{
			if (ctx.callIndex == 0) {
				const style = ctx.styleArgs[0] as Style;
				ctx.styleArgs.push({
					background: style.background == this.OverlayPanelBackgroundColor().css() ? "rgba(180,180,180,.7)" : "rgba(130,130,130,.7)",
				});
			}
		});*/
	}
}
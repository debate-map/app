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
	BasePanelDropShadowFilter = ()=>DMSkin.main.BasePanelDropShadowFilter();
	OverlayPanelBackgroundColor = ()=>chroma("rgba(255,255,255,.7)");
	NavBarPanelBackgroundColor = ()=>this.OverlayPanelBackgroundColor();
	OverlayBorder = ()=>"1px solid rgba(85,85,85,.5)";
	HeaderFont = ()=>"Cinzel";
	//MainFont = ()=>"TypoPRO Bebas Neue";
	MainFont = ()=>"'Quicksand', sans-serif";
	TextColor = ()=>chroma("rgb(43,55,85)");
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

	StyleOverride_Button = ()=>`color: ${this.TextColor().css()} !important;`;
	StyleBlock_Freeform = ()=>DMSkin.main.StyleBlock_Freeform("SLSkin");
	CSSHooks_Freeform = ()=>{
		DMSkin.main.CSSHooks_Freeform("SLSkin");
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
import {UserRow} from "UI/Database/Users.js";
import {chroma_maxDarken, inFirefox, NavBarButton, SubNavBar, SubNavBarButton} from "web-vcore";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import chroma from "web-vcore/nm/chroma-js.js";
import {addHook_css} from "web-vcore/nm/react-vextensions";
import {DMSkin} from "./DMSkin.js";

export function GetCinzelStyleForBold() {
	// Firefox renders Cinzel-bold wrong, so use alt (not quite as smooth as real bold, but the best solution I know atm for FF)
	if (inFirefox) return {textShadow: "0px 0px rgba(0,0,0,1)"};
	return {fontWeight: "bold"};
}

export class SLSkin extends DMSkin {
	static main = new SLSkin();

	// dm-specific extensions
	// ==========

	override NodeTextColor = ()=>this.TextColor();
	override NodeSubPanelBackgroundColor = ()=>chroma("rgba(0,0,0,.2)");
	override HasWhiteLeftBoxBackground = ()=>true;

	// scalars
	// ==========

	override NavBarPanelBackgroundColor = ()=>this.OverlayPanelBackgroundColor();
	override HeaderFont = ()=>"Cinzel";
	override TextColor = ()=>chroma("rgb(43,55,85)");
	override ListEntryBackgroundColor_Light = ()=>this.BasePanelBackgroundColor().alpha(1);
	override ListEntryBackgroundColor_Dark = ()=>this.BasePanelBackgroundColor().darken(.075 * chroma_maxDarken).alpha(1);

	// styles
	// ==========

	// blocks of raw-css or hooks/code
	// ==========

	override RawCSS_Freeform() {
		return `
			${super.RawCSS_Freeform()}
			
			/* overrides */
			.NodeBox > .ExpandableBox_mainContent .Button, .NodeUI_BottomPanel .Button {
				color: ${this.NodeTextColor().css()} !important;
			}
			/* new */
			.NodeUI_BottomPanel .uplot {
				filter: invert(.6);
			}
		`;
	}
	override CSSHooks_Freeform() {
		super.CSSHooks_Freeform();
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
import {nodeLightBackground} from "Store/db_ext/nodes";
import {Chroma, chroma_maxDarken, DefaultSkin, PageContainer, Skin, SubNavBar} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {Button} from "web-vcore/nm/react-vcomponents";
import {addHook_css} from "web-vcore/nm/react-vextensions";

// add as global, so one can easily test out new colors using the browser dev-tools
globalThis.chroma = chroma;

// We inherit from Skin instead of DefaultSkin, to ensure that DMSkin implements every property directly.
export class DMSkin extends Skin {
	static main = new DMSkin();

	// dm-specific extensions
	// ==========

	//NodeTextColor = ()=>Chroma("rgb(0,0,0)");
	NodeTextColor = ()=>{
		if (nodeLightBackground) return Chroma("rgba(0,0,0,.8)");
		return Chroma("rgba(255,255,255,.8)");
	};
	NodeSubPanelBackgroundColor = ()=>Chroma("rgba(0,0,0,.5)");
	HasLightBackground = ()=>this.TextColor() == this.TextColor_Dark();
	HasWhiteLeftBoxBackground = ()=>false;

	// scalars
	// ==========

	override BasePanelBackgroundColor = ()=>Chroma("rgba(200,200,200,.7)");
	override BasePanelDropShadowFilter = ()=>"drop-shadow(rgba(200,200,200,.7) 0px 0px 10px)";
	override OverlayPanelBackgroundColor = ()=>Chroma("rgba(255,255,255,.7)");
	//override NavBarPanelBackgroundColor = ()=>Chroma("rgba(0,0,0,.7)");
	override NavBarPanelBackgroundColor = ()=>this.BasePanelBackgroundColor().alpha(.9);
	override OverlayBorderColor = ()=>Chroma("rgba(0,0,0,.3)");
	override OverlayBorder = ()=>`1px solid ${this.OverlayBorderColor().css()}`;
	override HeaderFont = ()=>this.MainFont();
	override MainFont = ()=>"Quicksand, Symbola, AdobeNotDef, sans-serif";
	override TextColor = ()=>this.TextColor_Dark();
	override TextColor_Dark = ()=>Chroma("rgb(50,50,50)");
	override TextColor_Light = ()=>Chroma("rgba(255,255,255,.7)");
	override NavBarBoxShadow = ()=>"rgba(100,100,100,.3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px";
	override HeaderColor = ()=>this.ListEntryBackgroundColor_Dark();
	override ListEntryBackgroundColor_Light = ()=>this.BasePanelBackgroundColor().darken(.075 * chroma_maxDarken).alpha(1);
	override ListEntryBackgroundColor_Dark = ()=>this.BasePanelBackgroundColor().darken(.15 * chroma_maxDarken).alpha(1);

	// styles
	// ==========

	// fixes that height:100% doesn't work in safari, when in flex container
	override Style_Page = ()=>({width: 960, flex: 1, margin: "100px auto", padding: 50, background: "rgba(0,0,0,.75)", borderRadius: 10, cursor: "auto"});
	override Style_VMenuItem = ()=>({padding: "3px 5px", borderTop: "1px solid rgba(255,255,255,.1)", backgroundColor: "rgba(255,255,255,1)"});
	override Style_FillParent = ()=>({position: "absolute", left: 0, right: 0, top: 0, bottom: 0});
	override Style_XButton = ()=>({padding: "5px 10px"});

	// blocks of raw-css or hooks/code
	// ==========

	override RawCSS_ApplyScalarsAndStyles() {
		const cssFromWVC = DefaultSkin.prototype.RawCSS_ApplyScalarsAndStyles.call(this); // can't use "super.X()", since DMSkin doesn't inherit from DefaultSkin
		return cssFromWVC;
	}
	override RawCSS_Freeform() {
		const styleFixesFromWVC = DefaultSkin.prototype.RawCSS_Freeform.call(this); // can't use "super.X()", since DMSkin doesn't inherit from DefaultSkin
		return `
			${styleFixesFromWVC}
			
			a:not(.noMatch) {
				color: hsla(120,100%,25%,1)
			}
			a:not(.noMatch):hover {
				color: hsla(120,100%,30%,1)
			}
			.useLightText a:not(.noMatch) {
				color: hsla(120,100%,35%,1)
			}
			.useLightText a:not(.noMatch):hover {
				color: hsla(120,100%,40%,1)
			}

			table th {
				background-color: ${this.HeaderColor().css()};
			}
			table td {
				color: ${this.TextColor().css()};
			}
			.MapUI table td {
				color: ${this.NodeTextColor().css()};
			}
			/*.NodeUI_LeftBox, .NodeToolbar, .NodeUI_BottomPanel {
				color: ${this.NodeTextColor().css()} !important;
			}*/
			.NodeToolbar .VMenu {
				color: ${this.TextColor().css()} !important;
			}
			.NodeUI_LeftBox .Button {
				color: ${this.NodeTextColor().css()} !important;
			}
			.NodeBox > .ExpandableBox_mainContent .Button, .NodeUI_BottomPanel .Button {
				color: ${this.NodeTextColor().alpha(.5).css()} !important;
			}

			.VMenuItem:not(.disabled):not(.neverMatch):hover {
				background-color: rgb(200, 200, 200) !important;
			}

			.ReactModal__Content {
				background-color: rgba(255,255,255,0.75) !important;
			}
			.ReactModal__Content > div:first-child {
				background-color: rgba(255,255,255,1) !important;
			}
			
			.Button {
				word-break: initial; /* Buttons should *not* allow inherit the page-default "break-word" value, as this often leads to breaking on every letter. */
			}
			.ButtonBar_OptionUI {
				border-width: 1px 0 1px 1px !important;
				border-style: solid !important;
				border-color: ${this.OverlayBorderColor().css()} !important;
			}
			.ButtonBar_OptionUI:last-child {
				border-width: 1px 1px 1px 1px !important;
			}

			.dropdown__content:not(.neverMatch) {
				background-color: ${this.NavBarPanelBackgroundColor().css()} !important;
				border: ${this.OverlayBorder()};
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
			.ArgumentsControlBar > div:first-child > div {
				color: rgb(199, 202, 209) !important;
			}

			.ProposalsUI [role="button"] > div > a {
				color: rgba(0,0,0,1);
			}
			.ProposalsUI [role="button"] > div > a:hover {
				color: rgba(50,50,50,1);
			}
		`;
	}
	override CSSHooks_Freeform() {
		// these hooks are (also) used as the base for other skins
		addHook_css(Button, ctx=>{
			if (ctx.key == "finalStyle") {
				ctx.styleArgs.Insert(ctx.styleArgs.length - 1, {
					backgroundColor: "rgba(130,140,150,.6)",
					color: this.TextColor().css(),
				});
			}
		});
		addHook_css(PageContainer, ctx=>{
			if (ctx.key == "outerStyle_base" && !!ctx.styleArgs[2]) {
				ctx.styleArgs.push({filter: this.BasePanelDropShadowFilter()});
			}
			if (ctx.key == "innerStyle_base" && !!ctx.styleArgs[1]) {
				ctx.styleArgs.push({background: this.BasePanelBackgroundColor().css()});
			}
		});

		/*let asBaseFor: (new(..._)=>Skin)|undefined;
		for (const childType of [SLSkin]) {
			if (this instanceof childType) asBaseFor = SLSkin;
		}*/
		const targetSkinType = this.constructor;

		// these hooks we only add if we're the actual skin being used
		if (targetSkinType == DMSkin) {
			addHook_css(SubNavBar, ctx=>{
				if (ctx.key == "sub1") {
					ctx.styleArgs.push({
						//background: this.NavBarPanelBackgroundColor().css(),
						background: Chroma("rgba(0,0,0,.7)").css(),
						boxShadow: this.NavBarBoxShadow(),
						color: "rgb(255,255,255)",
					});
				}
			});
		}
	}
}
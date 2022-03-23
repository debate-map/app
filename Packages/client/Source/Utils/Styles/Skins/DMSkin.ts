import {chroma_maxDarken} from "Utils/UI/General.js";
import {Chroma, DefaultSkin, PageContainer, Skin, SubNavBar} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {ProposalsColumn, ProposalEntryUI, ProposalsUserRankingColumn, ProposalUI_Inner, ProposalUI, ProposalsUI} from "web-vcore/nm/graphql-feedback.js";
import {Button} from "web-vcore/nm/react-vcomponents";
import {addHook_css} from "web-vcore/nm/react-vextensions";

// add as global, so one can easily test out new colors using the browser dev-tools
globalThis.chroma = chroma;

export class DMSkin extends Skin {
	static main = new DMSkin();

	// scalars
	// ==========

	BasePanelBackgroundColor = ()=>Chroma("rgba(200,200,200,.7)");
	BasePanelDropShadowFilter = ()=>"drop-shadow(rgba(200,200,200,.7) 0px 0px 10px)";
	OverlayPanelBackgroundColor = ()=>Chroma("rgba(255,255,255,.7)");
	//NavBarPanelBackgroundColor = ()=>Chroma("rgba(0,0,0,.7)");
	NavBarPanelBackgroundColor = ()=>this.BasePanelBackgroundColor().alpha(.9);
	OverlayBorderColor = ()=>Chroma("rgba(0,0,0,.3)");
	OverlayBorder = ()=>`1px solid ${this.OverlayBorderColor().css()}`;
	HeaderFont = ()=>this.MainFont();
	MainFont = ()=>"'Quicksand', sans-serif";
	TextColor = ()=>Chroma("rgb(50,50,50)");
	NavBarBoxShadow = ()=>"rgba(100,100,100,.3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px";
	HeaderColor = ()=>this.ListEntryBackgroundColor_Dark();
	ListEntryBackgroundColor_Light = ()=>this.BasePanelBackgroundColor().darken(.075 * chroma_maxDarken).alpha(1);
	ListEntryBackgroundColor_Dark = ()=>this.BasePanelBackgroundColor().darken(.15 * chroma_maxDarken).alpha(1);

	// dm-specific
	//NodeTextColor = ()=>Chroma("rgb(0,0,0)");
	NodeTextColor = ()=>Chroma("rgba(255,255,255,.7)");
	NodeSubPanelBackgroundColor = ()=>Chroma("rgba(0,0,0,.5)");

	// styles
	// ==========

	// fixes that height:100% doesn't work in safari, when in flex container
	Style_Page = ()=>({width: 960, flex: 1, margin: "100px auto", padding: 50, background: "rgba(0,0,0,.75)", borderRadius: 10, cursor: "auto"});
	Style_VMenuItem = ()=>({padding: "3px 5px", borderTop: "1px solid rgba(255,255,255,.1)", backgroundColor: "rgba(255,255,255,1)"});
	Style_FillParent = ()=>({position: "absolute", left: 0, right: 0, top: 0, bottom: 0});
	Style_XButton = ()=>({padding: "5px 10px"});

	// style overrides and blocks
	// ==========

	// we implement these as regular prototype-bound methods, so that child-classes can rebind the func's "this" to itself
	StyleBlock_Freeform() {
		const styleFixesFromWVC = DefaultSkin.prototype.StyleBlock_Freeform.call(this);
		return `
			${styleFixesFromWVC}
			
			a:not(.noMatch) {
				color: rgba(0,130,0,1);
			}
			a:not(.noMatch):hover {
				color: rgba(0,160,0,1);
			}
			table th {
				background-color: ${this.HeaderColor().css()};
			}
			table td {
				color: ${this.TextColor().css()};
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
			.NodeUI_Inner > .ExpandableBox_mainContent .Button, .NodeUI_BottomPanel .Button {
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
	CSSHooks_Freeform() {
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

		// graphql-feedback
		addHook_css(ProposalsUI, ctx=>{
			if (ctx.callIndex == 0) ctx.styleArgs.push({filter: this.BasePanelDropShadowFilter()});
		});
		addHook_css(ProposalsColumn, ctx=>{
			if (ctx.callIndex == 1) ctx.styleArgs.push({background: this.HeaderColor().css()});
		});
		addHook_css(ProposalsUserRankingColumn, ctx=>{
			if (ctx.callIndex == 1) ctx.styleArgs.push({background: this.HeaderColor().css()});
		});
		//addHook_css(ProposalEntryUI, ctx=>{
		// ProposalEntryUI is wrapped, so attach by string/name instead
		addHook_css("ProposalEntryUI", ctx=>{
			if (ctx.callIndex == 0) {
				ctx.styleArgs.push({
					background: ctx.self["props"].index % 2 == 0 ? this.ListEntryBackgroundColor_Light().css() : this.ListEntryBackgroundColor_Dark().css(),
				});
			}
		});
		addHook_css(ProposalUI, ctx=>{
			if (ctx.callIndex == 2) ctx.styleArgs.push({filter: this.BasePanelDropShadowFilter()});
		});
		addHook_css(ProposalUI_Inner, ctx=>{
			if (ctx.callIndex == 0) ctx.styleArgs.push({background: this.BasePanelBackgroundColor().css()});
			else if (ctx.callIndex == 2 || ctx.callIndex == 3) ctx.styleArgs.push({color: this.TextColor().css()});
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
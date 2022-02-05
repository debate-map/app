import {addHook_css, SubNavBar} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {Skin} from "../Skin.js";

export class DMSkin_Old extends Skin {
	static main = new DMSkin_Old();

	// scalars
	// ==========

	BasePanelBackgroundColor = ()=>chroma("rgba(0,0,0,.7)");
	BasePanelDropShadowFilter = ()=>undefined;
	OverlayPanelBackgroundColor = ()=>chroma("rgba(0,0,0,.7)");
	NavBarPanelBackgroundColor = ()=>this.OverlayPanelBackgroundColor();
	OverlayBorderColor = ()=>undefined;
	OverlayBorder = ()=>undefined;
	HeaderFont = ()=>this.MainFont();
	MainFont = ()=>{
		let fonts = `'Roboto', 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
		// add these fonts at end, for providing colored emojis (otherwise it falls back to non-colored ones for, eg. ✔ and ⚙ -- though not 🚧)
		fonts += `, 'segoe ui emoji', 'noto color emoji', 'android emoji', 'emojisymbols', 'emojione mozilla', 'twemoji mozilla', 'segoe ui symbol'`;
		return fonts;
	};
	TextColor = ()=>chroma("rgba(255,255,255,.7)");
	NavBarTextColor = ()=>"rgb(255,255,255)";
	//navBarBoxShadow: "rgba(70,70,70,.5) 0px 0px 150px",
	//navBarBoxShadow: "rgba(100,100,100,1) 0px 0px 3px",
	NavBarBoxShadow = ()=>"rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px";
	HeaderColor = ()=>this.ListEntryBackgroundColor_Dark();
	ListEntryBackgroundColor_Light = ()=>chroma("rgba(30,30,30,.7)");
	ListEntryBackgroundColor_Dark = ()=>chroma("rgba(0,0,0,.7)");

	// styles
	// ==========

	// fixes that height:100% doesn't work in safari, when in flex container
	Style_Page = ()=>({width: 960, flex: 1, margin: "100px auto", padding: 50, background: "rgba(0,0,0,.75)", borderRadius: 10, cursor: "auto"});
	Style_VMenuItem = ()=>({padding: "3px 5px", borderTop: "1px solid rgba(255,255,255,.1)"});
	Style_FillParent = ()=>({position: "absolute", left: 0, right: 0, top: 0, bottom: 0});
	Style_XButton = ()=>({padding: "5px 10px"});

	// style overrides and blocks
	// ==========

	StyleBlock_Freeform = ()=>`
		.VMenu > div:first-child { border-top: initial !important; }
	`;
	CSSHooks_Freeform = ()=>{
		addHook_css(SubNavBar, ctx=>{
			if (ctx.key == "sub1") {
				ctx.styleArgs.push({
					background: this.OverlayPanelBackgroundColor().css(),
					boxShadow: this.NavBarBoxShadow(),
					color: "rgb(255,255,255)",
				});
			}
		});
	}
}
import chroma from "web-vcore/nm/chroma-js.js";
import {Skin} from "../Skin.js";

export class DMSkin extends Skin {
	static main = new DMSkin();

	MainBackgroundColor = ()=>chroma("rgba(0,0,0,.7)");
	HeaderFont = ()=>this.MainFont();
	MainFont = ()=>{
		let fonts = `'Roboto', 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
		// add these fonts at end, for providing colored emojis (otherwise it falls back to non-colored ones for, eg. ✔ and ⚙ -- though not 🚧)
		fonts += `, 'segoe ui emoji', 'noto color emoji', 'android emoji', 'emojisymbols', 'emojione mozilla', 'twemoji mozilla', 'segoe ui symbol'`;
		return fonts;
	};
	TextColor = ()=>"rgba(255,255,255,.7)";
}
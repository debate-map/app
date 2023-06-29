import {SLMode} from "UI/@SL/SL";
import {DMSkin} from "./Skins/DMSkin.js";
import {SLSkin} from "./Skins/SLSkin.js";

export const liveSkin = (()=>{
	let skin: DMSkin = DMSkin.main;
	if (SLMode) skin = SLSkin.main;
	return skin;
})();
//export function SetLiveSkin(skin: Skin) { liveSkin = skin; }
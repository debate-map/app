import {GADDemo} from "UI/@GAD/GAD";
import {Skin} from "./Skin.js";
import {DMSkin} from "./Skins/DMSkin.js";
import {SLSkin} from "./Skins/SLSkin.js";

export const liveSkin = (()=>{
	let skin: Skin = DMSkin.main;
	if (GADDemo) skin = SLSkin.main;
	return skin;
})();
//export function SetLiveSkin(skin: Skin) { liveSkin = skin; }
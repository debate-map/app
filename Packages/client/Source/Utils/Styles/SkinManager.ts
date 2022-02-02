import {GADDemo} from "UI/@GAD/GAD";
import {DMSkin} from "./Skins/DMSkin";
import {SLSkin} from "./Skins/SLSkin";

export const liveSkin = (()=>{
	let skin = DMSkin.main;
	if (GADDemo) skin = SLSkin.main;
	return skin;
})();
//export function SetLiveSkin(skin: Skin) { liveSkin = skin; }
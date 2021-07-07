import {presetBackgrounds, defaultPresetBackground} from "Utils/UI/PresetBackgrounds.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {GetUserHidden} from "dm_common";

// backgrounds
// ==========

export class BackgroundConfig {
	color?: string|n;

	extension?: string|n; // used to infer the urls (default: jpg)
	url_max?: string|n;
	url_256?: string|n;
	url_1920?: string|n;
	url_3840?: string|n;

	position?: string|n;
	size?: string|n;
}

export function GetUserBackground(userID: string|n): BackgroundConfig {
	if (GADDemo) return {color: "#ffffff"};

	const user_p = GetUserHidden(userID);
	if (!user_p) return presetBackgrounds[defaultPresetBackground];

	if (user_p.backgroundCustom_enabled) {
		return {
			color: user_p.backgroundCustom_color,
			url_1920: user_p.backgroundCustom_url,
			url_3840: user_p.backgroundCustom_url,
			url_max: user_p.backgroundCustom_url,
			position: user_p.backgroundCustom_position || "center center",
		};
	}

	const background = presetBackgrounds[user_p.backgroundID!] || presetBackgrounds[defaultPresetBackground];
	return background;
}
import {presetBackgrounds, defaultPresetBackground} from "Utils/UI/PresetBackgrounds.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {GetUser_Private} from "dm_common";

// backgrounds
// ==========

export class BackgroundConfig {
	color?: string;

	extension?: string; // used to infer the urls (default: jpg)
	url_max?: string;
	url_256?: string;
	url_1920?: string;
	url_3840?: string;

	position?: string;
	size?: string;
}

export function GetUserBackground(userID: string): BackgroundConfig {
	if (GADDemo) return {color: "#ffffff"};

	const user_p = GetUser_Private(userID);
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
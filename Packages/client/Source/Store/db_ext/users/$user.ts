import {presetBackgrounds, defaultPresetBackground} from "Utils/UI/PresetBackgrounds.js";
import {GetUserHidden} from "dm_common";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {SLMode, ShowHeader} from "../../../UI/@SL/SL.js";

// backgrounds
// ==========

export class BackgroundConfig {
	color?: string|n;

	extension?: string|n; // used to infer the urls (default: jpg)
	// maybe temp; if one of these fields starts with "background: ", it'll be used as a background-style-override (needed for, eg. hard-coded tiling background-images)
	url_max?: string|n;
	url_256?: string|n;
	url_1920?: string|n;
	url_3840?: string|n;

	position?: string|n;
	size?: string|n;

	// maybe temp; needed for some special-case backgrounds (eg. for tiling background-images)
	//styleOverride?: string;
}

export const GetUserBackground = CreateAccessor((userID: string|n, allowCustomOverride = true): BackgroundConfig=>{
	if (SLMode) {
		// if header is disabled, it means we're in the iframe for the special frontend; change background accordingly
		if (!ShowHeader) {
			return {
				url_max: "background: repeat url(/Images/@SL/BackgroundTile.png), #ffffff",
			};
		}
		return {color: "#ffffff"};
	}

	const user_p = GetUserHidden(userID);
	if (!user_p) return presetBackgrounds[defaultPresetBackground];

	if (user_p.backgroundCustom_enabled && allowCustomOverride) {
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
});
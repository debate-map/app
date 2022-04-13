import {MeID} from "dm_common";
import React from "react";
import {GetUserBackground} from "Store/db_ext/users/$user";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {Observer} from "web-vcore";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

//export const Button_background_dark = Chroma("rgba(90,100,110,0.9)").css(); // same as hover color, except .9 alpha instead of .8
//export const Button_background_dark = Chroma(Button_styles.root.backgroundColor).darken(chroma_maxDarken * .05).css();

@Observer
export class RootStyles extends BaseComponent<{}, {}> {
	ComponentWillMount() {
		const skin = liveSkin;
		skin.CSSHooks_Freeform();
	}
	loadingUI = ()=>null;
	render() {
		const background = GetUserBackground(MeID());
		const firstExtantBackgroundURL_1920Plus = background.url_1920 || background.url_3840 || background.url_max;
		const firstExtantBackgroundURL_3840Plus = background.url_3840 || background.url_max;
		const firstExtantBackgroundURL_max = background.url_max;
		const skin = liveSkin;

		return (
			<style>{`

			html, body:not(.neverMatch) {
				font-family: ${skin.MainFont()};
				color: ${skin.TextColor().css()};
			}

			.background {
			${
				firstExtantBackgroundURL_1920Plus?.startsWith("background: ")
					? `background: ${firstExtantBackgroundURL_1920Plus.replace("background: ", "")}`
					: `background-color: ${background.color};
						background-image: url(${firstExtantBackgroundURL_1920Plus});
						background-position: ${background.position || "center center"};
						background-size: ${background.size || "cover"};`
			}
			}
			@media (min-width: 1921px) {
				.background {
				${
					firstExtantBackgroundURL_3840Plus?.startsWith("background: ")
						? `background: ${firstExtantBackgroundURL_3840Plus.replace("background: ", "")}`
						: `background-image: url(${firstExtantBackgroundURL_3840Plus});`
				}
				}
			}
			@media (min-width: 3841px) {
				.background {
				${
					firstExtantBackgroundURL_max?.startsWith("background: ")
						? `background: ${firstExtantBackgroundURL_max.replace("background: ", "")}`
						: `background-image: url(${firstExtantBackgroundURL_max});`
				}
				}
			}

			${skin.StyleBlock_Freeform()}

			`}</style>
		);
	}
}
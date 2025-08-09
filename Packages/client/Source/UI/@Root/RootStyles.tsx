import {MeID} from "dm_common";
import React, {useEffect, useMemo} from "react";
import {GetUserBackground} from "Store/db_ext/users/$user";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {observer_mgl} from "mobx-graphlink";

//export const Button_background_dark = Chroma("rgba(90,100,110,0.9)").css(); // same as hover color, except .9 alpha instead of .8
//export const Button_background_dark = Chroma(Button_styles.root.backgroundColor).darken(chroma_maxDarken * .05).css();
// It is defined in user-project rather than web-vcore, so that it can use observer_mgl (ie. evaluate mobx-fields) while determining its final css.
export const RootStyles = observer_mgl(()=>{
	const background = GetUserBackground(MeID());
	const firstExtantBackgroundURL_1920Plus = background.url_1920 || background.url_3840 || background.url_max;
	const firstExtantBackgroundURL_3840Plus = background.url_3840 || background.url_max;
	const firstExtantBackgroundURL_max = background.url_max;
	const skin = liveSkin;

	/*useEffect(()=>{
		skin.CSSHooks_Freeform();
	}, []);*/
	// we want to call CSSHooks_Freeform only once (well, unless skin changes); so use useMemo
	// TODO: rework CSSHooks_Freeform to be able to be called multiple times, without resulting in duplicate hooks getting registered
	useMemo(()=>{
		skin.CSSHooks_Freeform();
	}, [skin]);

	return (
		<style>{`
			${skin.RawCSS_ApplyScalarsAndStyles()}
			${skin.RawCSS_Freeform()}
			.background {
				${
					firstExtantBackgroundURL_1920Plus?.startsWith("background: ")
						? `background: ${firstExtantBackgroundURL_1920Plus.replace("background: ", "")}`
						: `
							background-color: ${background.color};
							background-image: url(${firstExtantBackgroundURL_1920Plus});
							background-position: ${background.position || "center center"};
							background-size: ${background.size || "cover"};
						`
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
		`}</style>
	);
});
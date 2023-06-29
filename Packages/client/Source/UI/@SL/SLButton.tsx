import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import React from "react";
import {ButtonProps, Button} from "web-vcore/nm/react-vcomponents.js";
import {HSLA} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {GetCinzelStyleForBold} from "Utils/Styles/Skins/SLSkin";

export class Button_SL extends BaseComponent<{} & ButtonProps, {}> {
	render() {
		const {style, ...rest} = this.props;
		return (
			<Button {...rest as any}
				style={E(
					{
						padding: "5px 25px", backgroundColor: null, border: null, color: HSLA(221, 0.13, 0.42, 1),
						fontFamily: "'Cinzel', serif", fontVariant: "small-caps", fontSize: 17,
					},
					GetCinzelStyleForBold(),
					style,
				)}/>
		);
	}
}
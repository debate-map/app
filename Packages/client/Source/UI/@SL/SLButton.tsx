import {BaseComponent} from "react-vextensions";
import React from "react";
import {ButtonProps, Button} from "react-vcomponents";
import {HSLA} from "web-vcore";
import {E} from "js-vextensions";
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
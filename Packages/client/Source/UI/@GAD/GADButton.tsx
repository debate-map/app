import {BaseComponent} from "web-vcore/nm/react-vextensions";
import React from "react";
import {ButtonProps, Button} from "web-vcore/nm/react-vcomponents";
import {HSLA} from "vwebapp-framework";
import {E} from "web-vcore/nm/js-vextensions";

export class Button_GAD extends BaseComponent<{} & ButtonProps, {}> {
	render() {
		const {style, ...rest} = this.props;
		return (
			<Button {...rest}
				style={E(
					{
						padding: "5px 25px", backgroundColor: null, border: null, color: HSLA(221, 0.13, 0.42, 1),
						fontFamily: "'Cinzel', serif", fontVariant: "small-caps", fontSize: 17, fontWeight: "bold",
					},
					style,
				)}/>
		);
	}
}
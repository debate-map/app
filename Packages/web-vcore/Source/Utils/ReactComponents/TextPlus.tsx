import React from "react";
import {ApplyBasicStyles, BaseComponent, BaseComponentPlus, BasicStyles} from "react-vextensions";
import {TextProps, Row, Text} from "react-vcomponents";
import {InfoButton, InfoButtonProps} from "./InfoButton.js";

export class TextPlus extends BaseComponent<{info?: string, infoProps?: InfoButtonProps, sel?: boolean} & TextProps, {}> {
	render() {
		const {info, infoProps, sel, children, ...rest} = this.props;

		const text = <Text {...rest}>{children}</Text>;
		if (info) {
			return (
				<Row center>
					{text}
					<InfoButton {...infoProps} ml={5} text={info} sel={sel}/>
				</Row>
			);
		}
		return text;
	}
}
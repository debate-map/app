import React from "react";
import {TextProps, Row, Text} from "react-vcomponents";
import {InfoButton, InfoButtonProps} from "./InfoButton.js";

type TextPlusProps = {
    info?: string;
    infoProps?: InfoButtonProps;
    sel?: boolean;
} & TextProps;

export const TextPlus = (props: TextPlusProps)=>{
	const {info, infoProps, sel, children, ...rest} = props;

	const text = <Text {...rest}>{children}</Text>;
	if (info) {
		return (
            <Row center>
                {text}
                <InfoButton {...infoProps} ml={5} text={info} sel={sel} />
            </Row>
		);
	}
	return text;
};

import React, {HTMLProps} from "react";
import {css2} from "../UI/Styles.js";

export type InTooltipProps = {style?: any} & Partial<HTMLProps<HTMLDivElement>>;

export const InTooltip = (props: InTooltipProps)=>{
	const {style, children, ...rest} = props;
	const css = css2;
	return (
		<div {...rest} style={css({whiteSpace: "pre-wrap"}, style)}>
			{children}
		</div>
	);
};

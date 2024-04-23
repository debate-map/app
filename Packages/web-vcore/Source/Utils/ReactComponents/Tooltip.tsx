import {BaseComponent, cssHelper} from "react-vextensions";
import React, {HTMLProps} from "react";

//import "rc-tooltip/assets/bootstrap.css";

export type InTooltipProps = {style?: any} & Partial<HTMLProps<HTMLDivElement>>;

export class InTooltip extends BaseComponent<InTooltipProps, {}> {
	render() {
		const {style, children, ...rest} = this.props;
		const {css} = cssHelper(this);
		return (
			<div {...rest} style={css({whiteSpace: "pre-wrap"}, style)}>
				{children}
			</div>
		);
	}
}
import React from "react";
import {Row} from "react-vcomponents";
import {AddGlobalStyle} from "react-vextensions";
import classnames from "classnames";

AddGlobalStyle(`
.Paragraph {
	display: block;
    margin-block-start: 1em;
    margin-block-end: 1em;
    margin-inline-start: 0px;
    margin-inline-end: 0px;
}
.Paragraph:first-child {
	margin-top: 0;
}
`);

/** Variant of <p> which does not cause html warnings about div/ul/etc. children! */
export const Paragraph = (props: React.HTMLProps<HTMLParagraphElement>)=>{
	const {children, className, ...rest} = props;
	return (
		<div {...rest} className={classnames("Paragraph", className)}>
			{children}
		</div>
	);
}
// alias
export const P = Paragraph;
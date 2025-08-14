import {navBarHeight} from "UI/@Shared/NavBar";
import {E} from "js-vextensions";
import {subNavBarHeight} from "web-vcore";
import {TextArea} from "react-vcomponents";
import {ComponentProps} from "react";
import React from "react";

export const GetMaxSafeDialogContentHeight = ()=>window.innerHeight - navBarHeight - subNavBarHeight - 100;

export type TextArea_Div_Props = {
	value: string,
} & ComponentProps<typeof TextArea>;

/** Not actually a <textarea/> element, but mimics it. Useful in cases where you want auto-sizing for both width and height. */
export const TextArea_Div = (props: TextArea_Div_Props)=>{
	const {value, className, style, ...rest} = props;
	return (
		<div {...rest}
			className={[className, "selectable"].filter(a=>a).join(" ")}
			style={E({
				padding: 2, background: "white", border: "1px solid rgba(0,0,0,.5)",
				whiteSpace: "pre-wrap",
			}, style)}
		>
			{value}
		</div>
	);
};

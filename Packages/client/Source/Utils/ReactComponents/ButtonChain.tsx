import React from "react";
import {ES} from "web-vcore";
import {Row} from "react-vcomponents";
import {AddGlobalStyle, BaseComponent} from "react-vextensions";
import {PropsWithChildren} from "react";

/*export function CSS_Button_MatchSelectOption(selected = false) {
	return ES(
		{
			backgroundColor: "rgba(255,255,255,.3)",
			//color: "rgba(255,255,255,.7)",
			":hover": {backgroundColor: "rgba(255,255,255,.5)"},
		},
		selected && {backgroundColor: "rgba(255,255,255,.5)"},
	);
}*/
/*export function ButtonChain_Button_CSSOverrides(selected = false) {
	return ES(
		{
			//backgroundColor: "transparent",
			//color: "rgba(255,255,255,.7)",
		},
		//selected && {backgroundColor: "rgba(255,255,255,.5)"},
	);
}*/

AddGlobalStyle(`
.ButtonChain {
	background: rgba(255,255,255,.3);
}
.ButtonChain:hover {
	background: rgba(255,255,255,.5) !important;
}
.ButtonChain > .Button {
	background: transparent !important;
}
/* second version, with artifical specificity, to override button's own hover css */
.ButtonChain > .Button:hover:not(.neverMatch) {
	background: transparent !important;
}
`);

export type ButtonChain_Props = PropsWithChildren<{
	displayType?: "option",
	selected: boolean,
}>;

export const ButtonChain = (props: ButtonChain_Props)=>{
	const {displayType = "option", selected, children} = props;

	return (
		<Row className="ButtonChain" style={ES(
			{border: "1px solid rgba(0,0,0,0.3)", borderRadius: 5},
			selected && {background: "rgba(255,255,255,.5)"},
		)}>
			{children}
		</Row>
	);
};

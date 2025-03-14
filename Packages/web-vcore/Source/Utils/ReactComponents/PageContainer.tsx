import {ScrollView} from "react-vscrollview";
import {BaseComponent, BaseComponentPlus, cssHelper} from "react-vextensions";
import {Row, Div} from "react-vcomponents";
import {ToInt, IsNumber, E} from "js-vextensions";
import React from "react";
import {ES, css2} from "../UI/Styles.js";

export function GetExpandedCSSPropValuesFromString(propName: string, styleStrOrNum: string | number) {
	if (styleStrOrNum == null) return {};
	if (IsNumber(styleStrOrNum)) return GetExpandedCSSPropValuesFromValueArray(propName, [styleStrOrNum]);
	//const values = styleStrOrNum.match(/\d+/g).map(valStr=>ToInt(valStr));
	const values = styleStrOrNum.split(" "); //.map(valStr=>ToInt(valStr));
	return GetExpandedCSSPropValuesFromValueArray(propName, values);
}
export function GetExpandedCSSPropValuesFromValueArray(propName: string, styleValues: (string | number)[]) {
	/*if (styleValues.length === 1) {
		return {[propName]: styleValues[0]};
	}*/
	//function ExpandCSSPropValue(propName: string, ...values) {
	function Expand(...values: (string | number)[]) {
		return {
			[`${propName}Top`]: values[0],
			[`${propName}Right`]: values[1],
			[`${propName}Bottom`]: values[2],
			[`${propName}Left`]: values[3],
		};
	}
	//if (styleValues.length === 0) return Expand(0, 0, 0, 0);
	if (styleValues.length === 0) return {};
	if (styleValues.length === 1) return Expand(styleValues[0], styleValues[0], styleValues[0], styleValues[0]);
	if (styleValues.length === 2) return Expand(styleValues[0], styleValues[1], styleValues[0], styleValues[1]);
	if (styleValues.length === 3) return Expand(styleValues[0], styleValues[1], styleValues[2], styleValues[1]);
	if (styleValues.length === 4) return Expand(styleValues[0], styleValues[1], styleValues[2], styleValues[3]);
	return {}; // invalid number of values (must contain calc() or something); return empty object
}

export function ReactTextToPixelVal(reactText: string | number | n) {
	if (reactText == null) return null;
	if (IsNumber(reactText)) return reactText;
	if (reactText.trim() == "0") return 0;
	const pxMatch = reactText.match(/(\d+)px/);
	if (pxMatch) return ToInt(pxMatch[1]);
	return null;
}

export type PageContainerPreset = "text" | "full";

export const PageContainer: React.FC<
	{preset?: PageContainerPreset, scrollable?: boolean, shadow?: boolean, innerStyle?} & React.HTMLProps<ScrollView & Row>
> = props=>{
	const {preset = "text", scrollable = false, shadow: shadowProp, style, innerStyle, children, ...rest} = props;
	//const {css} = cssHelper();
	const css = css2;
	const outerStyle = style || {};
	const innerStyleFinal = innerStyle || {};
	let shadow = shadowProp;

	if (preset == "text" && shadow == null) {
		shadow = true;
	}

	const outerStyle_base = css("outerStyle_base",
		preset == "text" && {flex: "0 1 960px", margin: "50px 10px 20px 10px"},
		preset == "full" && {flex: 1, width: "100%", margin: "30px 0 0 0"},
		shadow && {filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"});
	const innerStyle_base = css("innerStyle_base",
		{display: "flex", flexDirection: "column", borderRadius: 10},
		preset == "text" && {padding: 50, background: `rgba(0,0,0,${shadow ? ".6" : ".8"})`});

	if (preset) {
		const marginValuesFromMarginProp = GetExpandedCSSPropValuesFromString("margin", css(outerStyle_base, outerStyle).margin as string);
		const marginValues = css(marginValuesFromMarginProp, outerStyle);
		const verticalMargin = (ReactTextToPixelVal(marginValues.marginTop) ?? 0) + (ReactTextToPixelVal(marginValues.marginBottom) ?? 0);
		outerStyle_base[preset == "full" ? "height" : "maxHeight"] = `calc(100% - ${verticalMargin}px)`;
	}

	if (scrollable) {
		return (
			<ScrollView {...rest as any}
				style={css("root", outerStyle_base, outerStyle)}
				contentStyle={css("root_content", innerStyle_base, innerStyleFinal)}
			>
				{children}
			</ScrollView>
		);
	}
	return (
		<Div {...rest as any}
			style={css("root", outerStyle_base, innerStyle_base, {alignItems: "stretch"}, outerStyle, innerStyleFinal)}
		>
			{children}
		</Div>
	);
};
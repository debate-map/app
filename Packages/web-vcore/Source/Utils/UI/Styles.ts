import {Assert, E} from "js-vextensions";
import {TextArea} from "react-vcomponents";
import {addHook_css, CompClass_Any, Style} from "react-vextensions";
import {AssertUnreachable} from "../General/General.js";

// value found since this is lowest value that yields: chroma("rgb(255,255,255)").darken(5.55).css() == "rgb(0,0,0)"
export const chroma_maxDarken = 5.55;

export type CSSColorStringType = "hsl" | "hsla";
/** Converts color-props into a css color-string of the specified format. */
export function CSSColor(
	/** [0-360] RefPoints: {red: 0, orange: 38, yellow: 60, green: 120, blue: 240, violet: 300, indigo: 274[?]} */
	hue: number,
	/** [0-1] */ saturation: number,
	/** [0-1] */ brightness: number,
	/** [0-1] */ alpha = 1,
	cssType: CSSColorStringType = "hsla",
) {
	if (cssType == "hsl") return `hsl(${hue}, ${saturation * 100}%, ${brightness * 100}%)`;
	if (cssType == "hsla") return `hsla(${hue}, ${saturation * 100}%, ${brightness * 100}%, ${alpha})`;
	AssertUnreachable(cssType);
}
export function HSL(
	/** [0-360] RefPoints: {red: 0, orange: 38, yellow: 60, green: 120, blue: 240, violet: 300, indigo: 274[?]} */
	hue: number,
	/** [0-1] */ saturation: number,
	/** [0-1] */ brightness: number,
) {
	return CSSColor(hue, saturation, brightness, undefined, "hsl");
}
export function HSLA(
	/** [0-360] RefPoints: {red: 0, orange: 38, yellow: 60, green: 120, blue: 240, violet: 300, indigo: 274[?]} */
	hue: number,
	/** [0-1] */ saturation: number,
	/** [0-1] */ brightness: number,
	/** [0-1] */ alpha = 1,
) {
	return CSSColor(hue, saturation, brightness, alpha, "hsla");
}

/* declare global {	function ES<E1,E2,E3,E4,E5,E6,E7,E8>(e1?:E1,e2?:E2,e3?:E3,e4?:E4,e5?:E5,e6?:E6,e7?:E7,e8?:E8):E1&E2&E3&E4&E5&E6&E7&E8; } G({ES});
function ES<E1,E2,E3,E4,E5,E6,E7,E8>(e1?:E1,e2?:E2,e3?:E3,e4?:E4,e5?:E5,e6?:E6,e7?:E7,e8?:E8):E1&E2&E3&E4&E5&E6&E7&E8 { */
// declare global { function ES(...styles): any; } G({ ES });
// same as E(...), except applies extra things for style-objects
export function ES(...styles) {
	const result = E(...styles);

	// prevents {flex: 1} from setting {[minWidth/minHeight]: "auto"}
	if (result.flex) {
		// if (result.flexDirection && result.flexDirection.includes("column")) {
		if (result.minWidth == null) result.minWidth = 0;
		if (result.minHeight == null) result.minHeight = 0;
	}

	return result;
}

addHook_css(CompClass_Any, ctx=>{
	// special cases, which should not have their styles modified
	if (ctx.self instanceof TextArea && ctx.self.props.autoSize) return; // if using TextArea with autoSize=true, don't modify styles (else minHeight may get set, which causes error in react-textarea-autosize)

	const merged = Object.assign({}, ...ctx.styleArgs);

	// prevents {flex: 1} from setting {[minWidth/minHeight]: "auto"}
	if (merged.flex) {
		const newEntry = {} as Style;
		if (merged.minWidth == null) newEntry.minWidth = 0;
		if (merged.minHeight == null) newEntry.minHeight = 0;
		ctx.styleArgs.push(newEntry);
	}
});
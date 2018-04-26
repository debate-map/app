// use require instead of import, so TS views the interface-extensions as global
/*let FindReact = require("react-vextensions");
let chroma = require("chroma-js");*/
import {FindReact} from "react-vextensions";
import chroma from "chroma-js";

// groups
// ==========

//require("./CE_Object");
import "./CE_Object";

// Node
// ==========

declare global {
	interface HTMLElement {
		R: any;
	}
}
HTMLElement.prototype._AddGetter_Inline = function R() { return FindReact(this); };

// Array
// ==========

declare global {
	interface Array<T> {
		AutoKey();
	}
}
Array.prototype._AddFunction_Inline = function AutoKey(this: any[]) {
	for (let [index, item] of this.entries()) {
		if (item && item.props) {
			item.key = item.key || index;
		}
	}
	return this;
};

// ChromaJS color
// ==========

declare global {
	type Color = chroma.Color & {
		Mix(otherColor: any, otherColorRatio?: number, colorSpace?: any): chroma.Color;
	}
}
Object.getPrototypeOf(chroma("rgb(255,0,0)"))._AddFunction_Inline = function Mix(otherColor: any, otherColorRatio = .5, colorSpace = "rgb" as any) {
	return chroma.mix(this, otherColor, otherColorRatio, colorSpace);
}
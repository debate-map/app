// use require instead of import, so TS views the interface-extensions as global
/* let FindReact = require("react-vextensions");
let chroma = require("chroma-js"); */
import {FindReact} from "web-vcore/nm/react-vextensions";
import chroma from "chroma-js";

// groups
// ==========

// require("./CE_Object");
import "./CE_Object";
import {ObjectCES, CE} from "web-vcore/nm/js-vextensions";
import {ObservableMap} from "web-vcore/nm/mobx";

// Node
// ==========

declare global { interface HTMLElement { R: any; } }
CE(HTMLElement.prototype)._AddGetter_Inline = function R() { return FindReact(this); };

// Map
// ==========

// declare global { interface HTMLElement { R: any; } }
// CE(Map.prototype)._AddGetter_Inline = function raw(this: Map<any, any>) {
Map.prototype["raw"] = function raw(this: Map<any, any>) {
	const result = {};
	for (const key of this.keys()) {
		result[key] = this.get(key);
	}
	return result;
};

// ObservableMap
// ==========

CE(ObservableMap.prototype)._AddGetterSetter("raw", function raw(this: Map<any, any>) {
	const result = {};
	for (const key of this.keys()) {
		result[key] = this.get(key);
	}
	return result;
}, null);

// Array
// ==========

/* declare global {
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
}; */

// ChromaJS color
// ==========

declare module "chroma-js" {
	interface Color {
		Mix(otherColor: any, otherColorRatio?: number, colorSpace?: any): chroma.Color;
	}
}
const ColorPrototype = Object.getPrototypeOf(chroma("rgb(255,0,0)"));
CE(ColorPrototype)._AddFunction("Mix", function Mix(otherColor: any, otherColorRatio = 0.5, colorSpace = "rgb" as any) {
	return chroma.mix(this, otherColor, otherColorRatio, colorSpace);
});
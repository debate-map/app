import React from "react";
import {Assert, WrapWithGo} from "js-vextensions";
import {SimpleShouldUpdate, WarnOfTransientObjectProps, SimpleShouldUpdate_Options, WarnOfTransientObjectProps_Options} from "react-vextensions";
import ReactDOM from "react-dom";
import {OnPopulated} from "../../Manager.js";
import {FixHTMLProps} from "react-vcomponents/Dist/@Types";

export type HTMLProps<T extends keyof React.JSX.IntrinsicElements> = React.JSX.IntrinsicElements[T];
export {FixHTMLProps};
export type HTMLProps_Fixed<T extends keyof React.JSX.IntrinsicElements> = FixHTMLProps<React.JSX.IntrinsicElements[T]>;

export function StandardCompProps() {
	return ["dispatch", "_user", "_permissions", "_extraInfo"];
}

export function ElementAcceptsTextInput(element: Element) {
	const elementType = element.tagName.toLowerCase();
	return (
		elementType == "textarea" ||
		(elementType == "input" && element.getAttribute("type") == "text")
	);
}

OnPopulated(()=>{
	// patch React.createElement to do early prop validation
	// ==========

	const createElement_old = React.createElement;
	React["createElement" as any] = function(componentClass, props) {
		if (componentClass.ValidateProps) {
			componentClass.ValidateProps(props);
		}
		return createElement_old.apply(this, arguments);
	};
});

export const RunWithRenderingBatched = WrapWithGo((func: Function)=>{
	ReactDOM.unstable_batchedUpdates(func as any);
});

/* export class ExpensiveComponent_Options {
	simpleShouldUpdate_call? = true;
	simpleShouldUpdate_options?: Partial<SimpleShouldUpdate_Options> = new SimpleShouldUpdate_Options();
	warnOfTransientObjectProps_call? = true;
	warnOfTransientObjectProps_options?: Partial<WarnOfTransientObjectProps_Options> = new WarnOfTransientObjectProps_Options();
}
export function ExpensiveComponent(targetClass: Function);
export function ExpensiveComponent(options: Partial<ExpensiveComponent_Options>);
export function ExpensiveComponent(...args) {
	//Assert(targetClass instanceof Function, `Must decorate a class directly. (no "()" in "@ExpensiveComponent" line)`);
	//let options = new ExpensiveComponent_Options();
	let options = new ExpensiveComponent_Options();
	if (typeof args[0] == "function") {
		ApplyToClass(args[0]);
	} else {
		options = E(options, args[0]);
		return ApplyToClass;
	}

	function ApplyToClass(targetClass: Function) {
		if (options.simpleShouldUpdate_call) SimpleShouldUpdate(options.simpleShouldUpdate_options)(targetClass);
		if (options.warnOfTransientObjectProps_call) WarnOfTransientObjectProps(options.warnOfTransientObjectProps_options)(targetClass);
	}
} */
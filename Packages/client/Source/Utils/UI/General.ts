import chroma from "chroma-js";
import katex from "katex";
import {MouseEvent} from "react";
import {RunWithRenderingBatched} from "web-vcore";
import {BailError} from "web-vcore/.yalc/mobx-graphlink";

// expose katex on window, for use by $node.ts (in js-common's shared-code, when running on client)
G({katex});

// todo: probably remove, since outdated
export function StandardCompProps() {
	return ["dispatch", "_user", "_permissions", "_extraInfo"] as const;
}

export function MarkHandled(event: React.SyntheticEvent) {
	event.preventDefault();
	event.nativeEvent["handled"] = true;
}
export function IsHandled(event: React.SyntheticEvent | Event) {
	if (event["nativeEvent"]) {
		return !!event["nativeEvent"].handled;
	}
	return !!event["handled"];
}

export function IsMouseEnterReal(event: React.MouseEvent<MouseEvent>, dom: HTMLElement) {
	const {fromElement, toElement} = event.nativeEvent as any;
	if (fromElement == null || toElement == null) return true; // just assume true
	return !dom.contains(fromElement) && dom.contains(toElement);
}
export function IsMouseLeaveReal(event: React.MouseEvent<MouseEvent>, dom: HTMLElement) {
	const {fromElement, toElement} = event.nativeEvent as any;
	if (fromElement == null || toElement == null) return true; // just assume true
	return dom.contains(fromElement) && !dom.contains(toElement);
}

export function TreeGraphDebug() {
	return !!globalThis.treeGraphDebug || startURL.GetQueryVar("extra")?.includes("treeGraphDebug");
}

export function BorderRadiusCSS(value: number|string, {tl = true, tr = true, bl = true, br = true} = {}) {
	const radiusAsStr = typeof value == "number" ? `${value}px` : value;
	return `${tl ? radiusAsStr : 0} ${tr ? radiusAsStr : 0} ${br ? radiusAsStr : 0} ${bl ? radiusAsStr : 0}`;
}

export function RunWithRenderingBatchedAndBailsCaught(func: Function) {
	RunWithRenderingBatched(()=>{
		try {
			func();
		} catch (ex) {
			if (ex instanceof BailError) {
				//console.log(`Caught bail error: ${ex.message}`);
			} else {
				throw ex;
			}
		}
	});
}
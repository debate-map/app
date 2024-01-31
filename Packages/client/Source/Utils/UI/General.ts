import chroma from "chroma-js";
import katex from "katex";
import {MouseEvent} from "react";
import {RunWithRenderingBatched} from "web-vcore";
import {BailError} from "web-vcore/.yalc/mobx-graphlink";

// expose katex on window, for use by $node.ts (in js-common's shared-code, when running on client)
G({katex});

export function TimeToString(time: number, makeFileNameSafe: boolean) {
	return DateToString(new Date(time), makeFileNameSafe);
}
export function DateToString(date: Date, makeFileNameSafe: boolean) {
	let result = date.toLocaleString("sv"); // ex: 2021-12-10 19:18:52
	if (makeFileNameSafe) result = result.replace(/[ :]/g, "-"); // ex: 2021-12-10-19-18-52
	return result;
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
import {Assert, IsString, ObjectCE} from "js-vextensions";
import {AssertUnreachable} from "../General/General.js";

export type Size = {width: number, height: number};
export enum GetSize_Method {
	/** Includes: content, padding. Excludes: border, margin, scroll-bar (if it has one), "position:absolute" descendants. */
	ClientSize = "ClientSize",
	/** Includes: content, padding, border, margin, scroll-bar (if it has one). Excludes: "position:absolute" descendants. */
	OffsetSize = "OffsetSize",
	/** Includes: content, padding, border, margin, scroll-bar (if it has one), "position:absolute" descendants. Excludes: none. */
	ScrollSize = "ScrollSize",
	/** Same as ScrollSize, except that it's calculated after the element's css transforms are applied. */
	BoundingClientRect = "BoundingClientRect",
	/** Lets you specify the exact list of components you want to include in the size calculation. */
	Custom = "Custom",
}
export type SizeComp = "content" | "padding" | "border" | "margin" | "scrollBar" | "posAbsDescendants";

export function GetSize(el: HTMLElement, method = GetSize_Method.ClientSize, custom_sizeComps?: SizeComp[]) {
	let size: Size;
	if (method == GetSize_Method.ClientSize) {
		size = {width: el.clientWidth, height: el.clientHeight};
	} else if (method == GetSize_Method.OffsetSize) {
		size = {width: el.offsetWidth, height: el.offsetHeight};
	} else if (method == GetSize_Method.ScrollSize) {
		size = {width: el.scrollWidth, height: el.scrollHeight};
	} else if (method == GetSize_Method.BoundingClientRect) {
		const rect = el.getBoundingClientRect();
		size = {width: rect.width, height: rect.height};
	} else if (method == GetSize_Method.Custom) {
		Assert(custom_sizeComps != null, "If method is Custom, custom_sizeProps must be specified.");
		const style = window.getComputedStyle(el, null);
		const styleProp = (name: string)=>parseFloat(style.getPropertyValue(name));

		const padding = {w: styleProp("padding-left") + styleProp("padding-right"), h: styleProp("padding-top") + styleProp("padding-bottom")};
		const base = {w: el.clientWidth - padding.w, h: el.clientHeight - padding.h};
		const border = {w: styleProp("border-left") + styleProp("border-right"), h: styleProp("border-top") + styleProp("border-bottom")};
		const margin = {w: styleProp("margin-left") + styleProp("margin-right"), h: styleProp("margin-top") + styleProp("margin-bottom")};
		const scrollBar = {w: (el.offsetWidth - el.clientWidth) - border.w - margin.w, h: (el.offsetHeight - el.clientHeight) - border.h - margin.h};
		const posAbsDescendants = {w: el.scrollWidth - el.offsetWidth, h: el.scrollHeight - el.offsetHeight};

		const sc = (name: SizeComp, valIfEnabled: number)=>(custom_sizeComps.includes(name) ? valIfEnabled : 0);
		size = {
			width: sc("content", base.w) + sc("padding", padding.w) + sc("border", border.w)
					+ sc("margin", margin.w) + sc("scrollBar", scrollBar.w) + sc("posAbsDescendants", posAbsDescendants.w),
			height: sc("content", base.h) + sc("padding", padding.h) + sc("border", border.h)
					+ sc("margin", margin.h) + sc("scrollBar", scrollBar.h) + sc("posAbsDescendants", posAbsDescendants.h),
		};
	} else {
		AssertUnreachable(method);
	}
	return size;
}

function GetHiddenHolder() {
	let holder = document.querySelector("#wvc_hiddenContainer") as HTMLDivElement;
	if (holder == null) {
		holder = document.createElement("div");
		holder.id = "wvc_hiddenContainer";
		holder.style.Extend({position: "absolute", left: `-1000px`, top: `-1000px`, width: `1000px`, height: `1000px`, overflow: "hidden"});
		document.body.appendChild(holder);
	}
	return holder;
}

declare var $;
const GetContentSize_cache = {};
export class GetContentSize_Options {
	method = GetSize_Method.ClientSize;
	method_custom_sizeComps?: SizeComp[];
	createClone = false;
	allowCache = true;
}
export function GetContentSize(content: string | Element, options?: Partial<GetContentSize_Options>) {
	const opts = Object.assign(new GetContentSize_Options(), options);
	/*var holder = $("#wvc_hiddenContainer");
	var contentClone = content.clone();
	holder.append(contentClone);
	var width = contentClone.outerWidth();
	var height = contentClone.outerHeight();
	contentClone.remove();*/

	const currentHTML = IsString(content) ? content : content.outerHTML;
	const cacheStore = IsString(content) ? GetContentSize_cache : (content["GetContentSize_cache"] = content["GetContentSize_cache"] || {});
	const cacheKey = JSON.stringify({html: currentHTML, opts: opts.IncludeKeys("method", "method_custom_sizeComps")});

	let result = opts.allowCache ? cacheStore[cacheKey] : null;
	if (result == null) {
		const holder = GetHiddenHolder();
		let tempHolder = document.createElement("div") as HTMLElement;
		holder.appendChild(tempHolder);
		if (IsString(content)) {
			tempHolder.innerHTML = content;
		} else {
			if (opts.createClone) {
				tempHolder.innerHTML = content.outerHTML;
			} else {
				tempHolder = content as HTMLElement;
			}
		}

		result = GetSize(tempHolder, opts.method, opts.method_custom_sizeComps);
		tempHolder.remove();

		if (opts.allowCache) {
			cacheStore[cacheKey] = result;
		}
	}
	return result;
}

export const autoElements = {} as {[key: string]: Element[]};
export function GetAutoElements(startHTML: string, useCache = true, storeInHolder = true) {
	if (useCache && autoElements[startHTML]) return autoElements[startHTML];

	//const holder = GetHiddenHolder();
	const tempHolder = document.createElement("div") as HTMLElement;
	//holder.appendChild(tempHolder);

	tempHolder.innerHTML = startHTML;
	const elements_fresh = [...tempHolder.children];
	//tempHolder.remove();

	if (useCache) {
		autoElements[startHTML] = elements_fresh;
	}
	if (storeInHolder) {
		const holder = GetHiddenHolder();
		for (const element of elements_fresh) {
			holder.appendChild(element);
		}
	}

	return elements_fresh;
}
export function GetAutoElement(startHTML: string) {
	return GetAutoElements(startHTML)[0];
}
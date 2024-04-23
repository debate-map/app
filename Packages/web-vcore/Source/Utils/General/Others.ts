import {VRect, Vector2, GetPropChanges} from "js-vextensions";
import {schemaEntryJSONs} from "mobx-graphlink";

// like js-vextensions GetPropChanges(), except also applies RemoveHelpers on the result (since intended to be used for db-objects)
export function GetUpdates(oldData, newData, useJSONCompare = false, useNullInsteadOfUndefined = true) {
	/*const result = {};
	for (const key of oldData.VKeys(true).concat(newData.VKeys(true))) {
		if (newData[key] !== oldData[key]) {
			result[key] = newData[key];
			if (newData[key] === undefined && useNullInsteadOfUndefined) {
				result[key] = null;
			}
		}
	}*/
	const result = GetPropChanges(oldData, newData, false, useJSONCompare).ToMapObj(a=>a.key, a=>a.newVal);
	if (useNullInsteadOfUndefined) {
		Object.entries(result).filter(a=>a[1] === undefined).forEach(a=>result[a[0]] = null);
	}
	//return RemoveHelpers(result);
	return result;
}

/** Element's bounding-rect relative to the screen/monitor. *#/
export function GetScreenRect(el: Element) {
	var clientRect = el.getBoundingClientRect();
	return new VRect(clientRect.left, clientRect.top, clientRect.width, clientRect.height, false);
}*/
/** Element's bounding-rect relative to the viewport, ie. the rectangle on the screen whose pixels are all controllable by the page. */
export function GetViewportRect(el: Element) {
	var clientRect = el.getBoundingClientRect();
	return new VRect(clientRect.left, clientRect.top, clientRect.width, clientRect.height, false);
}
/** Element's bounding-rect relative to the page, ie. the top-left pixel when scrolled to the very top of the page. (so y = GetViewportRect().y + window.pageYOffset) */
export function GetPageRect(el: Element) {
	var box = el.getBoundingClientRect();
	const win = el.ownerDocument.defaultView!;
	return new VRect(
		/*box.left + (window.pageXOffset || document.documentElement.scrollLeft) - (document.documentElement.clientLeft || 0),
		box.top + (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop  || 0),*/
		box.left + win.pageXOffset,
		box.top + win.pageYOffset,
		box.width,
		box.height,
	);
}
/** Element's bounding-rect relative to its "offsetParent", ie. the top-left pixel of the closest (nearest in hierarchy) "positioned" ancestor element. */
export function GetOffsetRect(el: Element) {
	return new VRect(el.clientLeft, el.clientTop, el.clientWidth, el.clientHeight, false);
}

const click_lastInfoForElement = {};
export function IsDoubleClick(event: React.MouseEvent<any>, maxTimeGap = 500, compareByPath = true) {
	const {lastClickInfo} = event.currentTarget;
	const time = Date.now();
	// console.log("Clicked...", event.currentTarget, ";", event.target, ";", lastClickInfo, ";", lastClickInfo && event.target == lastClickInfo.event.target);

	let path: string|undefined;
	if (compareByPath) {
		path = GetDOMPath(event.target);
		var isDoubleClick = lastClickInfo && path == lastClickInfo.path && time - lastClickInfo.time <= maxTimeGap;
	} else {
		var isDoubleClick = lastClickInfo && event.target == lastClickInfo.event.target && time - lastClickInfo.time <= maxTimeGap;
	}
	event.currentTarget.lastClickInfo = {event, time, path};
	event.persist();
	return isDoubleClick;
}

export function GetDOMPath_JQuery(el) {
	var stack = [] as string[];
	while (el.parentNode != null) {
		var sibCount = 0;
		var sibIndex = 0;
		for (var i = 0; i < el.parentNode.childNodes.length; i++) {
			var sib = el.parentNode.childNodes[i];
			if (sib.nodeName == el.nodeName) {
				if (sib === el) sibIndex = sibCount;
				sibCount++;
			}
		}
		if (el.hasAttribute("id") && el.id != "") {
			stack.unshift(`${el.nodeName.toLowerCase()}#${el.id}`);
		} else if (sibCount > 1) {
			stack.unshift(`${el.nodeName.toLowerCase()}:eq(${sibIndex})`);
		} else {
			stack.unshift(el.nodeName.toLowerCase());
		}
		el = el.parentNode;
	}

	return stack.slice(1); // removes the html element
}
export function GetDOMPath(el) {
	var stack = [] as string[];
	var isShadow = false;
	while (el.parentNode != null) {
		var sibCount = 0;
		var sibIndex = 0;
		// get sibling indexes
		for (var i = 0; i < el.parentNode.childNodes.length; i++) {
			var sib = el.parentNode.childNodes[i];
			if (sib.nodeName == el.nodeName) {
				if (sib === el) sibIndex = sibCount;
				sibCount++;
			}
		}
		// if ( el.hasAttribute('id') && el.id != '' ) { no id shortcuts, ids are not unique in shadowDom
		//	 stack.unshift(el.nodeName.toLowerCase() + '#' + el.id);
		// } else
		var nodeName = el.nodeName.toLowerCase();
		if (isShadow) {
			nodeName += "::shadow";
			isShadow = false;
		}
		if (sibCount > 1) {
			stack.unshift(`${nodeName}:nth-of-type(${sibIndex + 1})`);
		} else {
			stack.unshift(nodeName);
		}
		el = el.parentNode;
		if (el.nodeType === 11) { // for shadow dom, we
			isShadow = true;
			el = el.host;
		}
	}
	stack.splice(0, 1); // removes the html element
	return stack.join(" > ");
}

export function ClearPropsNotInSchema(obj, schemaName: string, GetSchemaJSON: (schemaName: string)=>any) {
	const schema = GetSchemaJSON(schemaName);
	for (const key of obj.VKeys()) {
		if (schema["properties"][key] == null) {
			delete obj[key];
		}
	}
}
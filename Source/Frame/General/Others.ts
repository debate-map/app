import {RemoveHelpers} from "../Database/DatabaseHelpers";

let _hScrollBarHeight;
export function GetHScrollBarHeight() {
	if (!_hScrollBarHeight) {
		let outer = $("<div style='visibility: hidden; position: absolute; left: -100; top: -100; height: 100; overflow: scroll;'/>").appendTo('body');
		let heightWithScroll = $("<div>").css({height: "100%"}).appendTo(outer).outerHeight();
		outer.remove();
		_hScrollBarHeight = 100 - heightWithScroll;
		//V._hScrollBarHeight = outer.children().height() - outer.children()[0].clientHeight;
	}
	return _hScrollBarHeight;
}
let _vScrollBarWidth;
export function GetVScrollBarWidth() {
	if (!_vScrollBarWidth) {
		let outer = $("<div style='visibility: hidden; position: absolute; left: -100; top: -100; width: 100; overflow: scroll;'/>").appendTo('body');
		let widthWithScroll = $("<div>").css({width: "100%"}).appendTo(outer).outerWidth();
		outer.remove();
		_vScrollBarWidth = 100 - widthWithScroll;
		//vScrollBarWidth = outer.children().width() - outer.children()[0].clientWidth + 1;
	}
	return _vScrollBarWidth;
}
export function HasScrollBar(control) { return HasVScrollBar(control) || HasHScrollBar(control); }
export function HasVScrollBar(control) { return control[0].scrollHeight > control[0].clientHeight; }
export function HasHScrollBar(control) { return control[0].scrollWidth > control[0].clientWidth; }

export function PropNameToTitle(propName: string) {
	// demo string: somePropName
	return propName
		// somePropName -> some prop name
		.replace(/[A-Z]/g, a=>" " + a.toLowerCase())
		// some prop name -> Some prop name
		.replace(/^./, a=>a.toUpperCase());
}

export function EnumNameToDisplayName(enumName: string) {
	let result = enumName;
	result = result.replace(/[a-z][A-Z]+/g, match=> {
		let result = match[0] + " ";
		if (match.length == 2) {
			result += match[1].toLowerCase();
		} else {
			result += match.slice(1);
		}
		return result;
	});
	return result;
}

/*export function FindDOM_(comp) { return $(FindDOM(comp)) as JQuery; };
G({FindDOM_});*/

let click_lastInfoForElement = {};
export function IsDoubleClick(event: React.MouseEvent<any>, maxTimeGap = 500, compareByPath = true) {
	let lastClickInfo = event.currentTarget.lastClickInfo;
	let time = Date.now();
	//console.log("Clicked...", event.currentTarget, ";", event.target, ";", lastClickInfo, ";", lastClickInfo && event.target == lastClickInfo.event.target);
	
	if (compareByPath) {
		var path = GetDOMPath(event.target);
		var isDoubleClick = lastClickInfo && path == lastClickInfo.path && time - lastClickInfo.time <= maxTimeGap;
	} else {
		var isDoubleClick = lastClickInfo && event.target == lastClickInfo.event.target && time - lastClickInfo.time <= maxTimeGap;
	}
	event.currentTarget.lastClickInfo = {event, time, path};
	event.persist();
	return isDoubleClick;
}

export function GetDOMPath_JQuery(el) {
	var stack = [];
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
			stack.unshift(el.nodeName.toLowerCase() + "#" + el.id);
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
	var stack = [];
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
		if ( sibCount > 1 ) {
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
	stack.splice(0,1); // removes the html element
	return stack.join(" > ");
 }
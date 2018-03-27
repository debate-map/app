import {RemoveHelpers} from "../Database/DatabaseHelpers";
import {Vector2i} from "js-vextensions";

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

/*export class Vector2iCache {
	static cache = {};
	static Get(x: number, y: number) {
		let key = `${x}|${y}`;
		return Vector2iCache.cache[key] || (Vector2iCache.cache[key] = new Vector2i(x, y));
	}
}*/

// from Globals_Free
// ==========
// ==========

// class/function tags
// ==========

/*export function Global(...args) {
	if (!(args[0] instanceof Function)) { // if decorator's being early-called, to provide args
		var [receiveClassFunc] = args;
		return (...args2)=> {
			var [target] = args2;
			receiveClassFunc(target);
			Global(...args2);
		};
	}

	var [target] = args as [Function];

	var name = target.GetName();
	//console.log("Globalizing: " + name);
	g[name] = target;
}*/
export function Global(target: Function) {
	var name = target.GetName();
	//console.log("Globalizing: " + name);
	g[name] = target;
}

export function Grab(grabFunc) {
	return target=>grabFunc(target);
}

/*export function SimpleShouldUpdate(target) {
	target.prototype.shouldComponentUpdate = function(newProps, newState) {
	    return ShallowCompare(this, newProps, newState);
		/*var result = ShallowCompare(this, newProps, newState);
		Log(result + ";" + g.ToJSON(this.props) + ";" + g.ToJSON(newProps));
		return result;*#/
	}
}*/

// polyfills for constants
// ==========

if (Number.MIN_SAFE_INTEGER == null)
	(Number as any).MIN_SAFE_INTEGER = -9007199254740991;
if (Number.MAX_SAFE_INTEGER == null)
	(Number as any).MAX_SAFE_INTEGER = 9007199254740991;

//function Break() { debugger; };
export function Debugger(...args) { debugger; }
export function Debugger_Wrap(arg1, ...args) { debugger; return arg1; }
export function Debugger_True(...args) { debugger; return true; }
export function Debugger_If(condition, ...args) {
    if (condition)
        debugger;
}
export function WrapWithDebugger(func, ...args) {
	return function() {
		debugger;
		func.apply(this, arguments);
	};
}
G({Debugger, Debugger_Wrap, Debugger_True, Debugger_If, WrapWithDebugger});

//var quickIncrementValues = {};
//export function QuickIncrement(name = new Error().stack.split("\n")[2]) { // this doesn't always work, fsr
export function QuickIncrement(name = "default") {
	QuickIncrement["values"][name] = (QuickIncrement["values"][name]|0) + 1;
	return QuickIncrement["values"][name];
}
QuickIncrement["values"] = [];
G({QuickIncrement});

// general
// ==========

/*G({E}); declare global { function E(...objExtends: any[]); }
export function E(...objExtends: any[]) {
    var result = {} as any;
    for (var extend of objExtends)
        result.Extend(extend);
	return result;
	//return StyleSheet.create(result);
}*/
G({E}); declare global {	function E<E1,E2,E3,E4,E5,E6,E7,E8>(e1?:E1,e2?:E2,e3?:E3,e4?:E4,e5?:E5,e6?:E6,e7?:E7,e8?:E8):E1&E2&E3&E4&E5&E6&E7&E8; }
export							function E<E1,E2,E3,E4,E5,E6,E7,E8>(e1?:E1,e2?:E2,e3?:E3,e4?:E4,e5?:E5,e6?:E6,e7?:E7,e8?:E8):E1&E2&E3&E4&E5&E6&E7&E8 {
	var result = {} as any;
	for (var extend of arguments)
		result.Extend(extend);
	return result;
	//return StyleSheet.create(result);
}

// methods: url writing/parsing
// ==================

export var inFirefox = navigator.userAgent.toLowerCase().includes("firefox");

// others
// ==================

/*export var inTestMode = true; //GetUrlVars(CurrentUrl()).inTestMode == "true";
export function InTestMode() { return inTestMode; }*/

export var blockCSCalls = false;

export var loadTime = Date.now();
/*setTimeout(()=> {
	$(()=> {
		loadTime = Date.now();
	});
});*/
export function GetTimeSinceLoad() {
	return (Date.now() - loadTime) / 1000;
}

//window.evalOld = window.eval;
//window.eval = function() { try { evalOld.apply(this, arguments); } catch(error) { Log("JS error: " + error); }};

/*window.evalOld = eval;
window.eval = function(code) {
    if (true) { //new Error().stack.Contains("Packages/VDF")) //!code.Contains(";") && code != "CallCS_Callback")
        window.lastSpecialEvalExpression = code;
        window.lastSpecialEvalStack = new Error().stack;
        //window.evalStacks = window.evalStacks || [];
        //window.evalStacks.push(new Error().stack);
        window.evalExpressionsStr += code + "\n";
        window.evalStacksStr += new Error().stack + "\n";
    }
    return evalOld.apply(this, arguments);
};*/

/*export function EStrToInt(eStr: string) {
	return parseInt(eStr.substr(1));
}
export function IntToEStr(int: number) {
	return "e" + int;
}*/

// another way to require at runtime -- with full paths
//g.RequireTest = (require as any).context("../../", true, /\.tsx?$/);

export function $Simple(queryStr): HTMLElement[] {
	return [].slice.call(document.querySelectorAll(queryStr));
}

export function CopyText(text) {
	/*
	//var note = $(`<input type="text">`).appendTo("body");
	var note = document.createElement("textarea");
	document.body.appendChild(note);
	note.innerHTML = text;

	note.focus();
	var range = document.createRange();
	range.setStart(note, 0);
	range.setEnd(note, 1);
	//range.setEnd(note2, 0);

	//range.setEnd(e("notesEnder"), 0); // adds one extra new-line; that's okay, right?
	var sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);

	document.execCommand("copy");*/

	(document as any).oncopy = function(event) {
		event.clipboardData.setData("text/plain", text);
		event.preventDefault();
		(document as any).oncopy = null;
	};
	(document as any).execCommand("copy", false, null);
}
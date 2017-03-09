import ShallowCompare from "react-addons-shallow-compare";

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

export function SimpleShouldUpdate(target) {
	target.prototype.shouldComponentUpdate = function(newProps, newState) {
	    return ShallowCompare(this, newProps, newState);
		/*var result = ShallowCompare(this, newProps, newState);
		g.Log(result + ";" + g.ToJSON(this.props) + ";" + g.ToJSON(newProps));
		return result;*/
	}
}

// property tags
// ==========

// add to prop to say "don't set the attachPoint prop, and don't call the PreAdd, PostAdd, and such methods)
export class NoAttach {}
export function _NoAttach() {
    return (target, name)=> {
        var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
        propInfo.AddTags(new NoAttach());
    };
};

export class ByPath extends NoAttach {
    constructor(saveNormallyForParentlessNode = false) {
        super();
        this.saveNormallyForParentlessNode = saveNormallyForParentlessNode;
    }
	saveNormallyForParentlessNode = false;
};
export function _ByPath(saveNormallyForParentlessNode = false) {
    return (target, name)=> {
        var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
        propInfo.AddTags(new ByPath(saveNormallyForParentlessNode));
    };
};

// maybe temp
export class ByPathStr extends ByPath {
    constructor(saveNormallyForParentlessNode = false) {
        super(saveNormallyForParentlessNode);
    }
};
export function _ByPathStr(saveNormallyForParentlessNode = false) {
	return (target, name)=> {
		var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
	    propInfo.AddTags(new ByPathStr(saveNormallyForParentlessNode));
	};
};

// save name of Node in prop, rather than the actual data in that Node
export class ByName extends NoAttach {}
export function _ByName() {
    return (target, name)=> {
        var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
        propInfo.AddTags(new ByName());
    };
};

// method tags
// ==========

export class IgnoreStartData {}
export function _IgnoreStartData() {
    return (target, name)=>target[name].AddTags(new IgnoreStartData());
};
export class IgnoreSetItem {}

// others
// ==========

export var vsInitFuncs = [];

// polyfills for constants
// ==========

if (Number.MIN_SAFE_INTEGER == null)
	(Number as any).MIN_SAFE_INTEGER = -9007199254740991;
if (Number.MAX_SAFE_INTEGER == null)
	(Number as any).MAX_SAFE_INTEGER = 9007199254740991;

//function Break() { debugger; };
export function Debugger() { debugger; }
export function Debugger_Wrap(arg1) { debugger; return arg1; }
export function Debugger_True() { debugger; return true; }
export function Debugger_If(condition) {
    if (condition)
        debugger;
}
g.Extend({Debugger, Debugger_Wrap, Debugger_True, Debugger_If});

// general
// ==========

export function E(...objExtends: any[]) {
    var result = {};
    for (var extend of objExtends)
        result.Extend(extend);
	return result;
	//return StyleSheet.create(result);
}
// for react-native-chart modifications...
window.Extend({E});

// methods: url writing/parsing
// ==================

export function CurrentUrl() { return window.location.href.replace(/%22/, "\""); } // note; look into the escaping issue more
export function GetUrlVars(url) {
	if (!url.contains('?'))
		return {length: 0} as any;

	var vars = {};

	var urlVarStr = url.contains("?") ? (url.contains("runJS=") ? url.slice(url.indexOf("?") + 1) : url.slice(url.indexOf("?") + 1).split("#")[0]) : "";
	var parts = urlVarStr.split("&");
	for (var i = 0; i < parts.length; i++)
		vars[parts[i].substring(0, parts[i].indexOf("="))] = parts[i].substring(parts[i].indexOf("=") + 1);

	return vars;
}

export var inFirefox = navigator.userAgent.toLowerCase().contains("firefox");

// Unity-linked
// ==================

export var launchVars = GetUrlVars(CurrentUrl());

//export var inUnity = launchVars.inUnity == "true"; // this var is set within the initial url of the Unity CoherentUIView
export var inUnity = navigator.userAgent.contains("; Unity 3D; ZFBrowser ");

export var inTestMode = true; //GetUrlVars(CurrentUrl()).inTestMode == "true";
export function InUnity() { return inUnity; } //return window.Unity;
export function InTestMode() { return inTestMode; }

export var blockCSCalls = false;

//window.evalOld = window.eval;
//window.eval = function() { try { evalOld.apply(this, arguments); } catch(error) { Log("JS error: " + error); }};

/*window.evalOld = eval;
window.eval = function(code) {
    if (true) { //new Error().stack.contains("Packages/VDF")) //!code.contains(";") && code != "CallCS_Callback")
        window.lastSpecialEvalExpression = code;
        window.lastSpecialEvalStack = new Error().stack;
        //window.evalStacks = window.evalStacks || [];
        //window.evalStacks.push(new Error().stack);
        window.evalExpressionsStr += code + "\n";
        window.evalStacksStr += new Error().stack + "\n";
    }
    return evalOld.apply(this, arguments);
};*/
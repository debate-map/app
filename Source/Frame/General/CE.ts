// ClassExtensions.ts
// ==========

var {VDF} = require("../Serialization/VDF/VDF");
var {List, Dictionary} = require("../Serialization/VDF/VDFExtras");
var {VDFTypeInfo} = require("../Serialization/VDF/VDFTypeInfo");

// Object: base
// ==================

// the below lets you do stuff like this: Array.prototype._AddFunction(function AddX(value) { this.push(value); }); []._AddX("newItem");
interface Object { _AddItem: (name: string, value)=>void; }
Object.defineProperty(Object.prototype, "_AddItem", { // note; these functions should by default add non-enumerable properties/items
	//configurable: true,
	enumerable: false,
	value: function(name, value, forceAdd) {
		if (name == null || name.length == 0)
			throw new Error("No prop-name was specified for _AddItem() call.");
		if (name in this) delete this[name];
		if (name in this && !forceAdd) return; // workaround for some properties not being deleted

		Object.defineProperty(this, name, {
			configurable: true, // for some reason, we get an error otherwise in non-dev mode (same for below)
			enumerable: false,
			value: value
		});
		/*if (this[name] == null)
			throw new Error(`Failed to add property "${name}" to type "${this}".`);*/
	}
});
interface Object { _AddFunction: (name: string, func: Function)=>void; }
Object.prototype._AddItem("_AddFunction", function(name, func) {
	//this._AddItem(func.name || func.toString().match(/^function\s*([^\s(]+)/)[1], func);
	this._AddItem(name, func);
});

// the below lets you do stuff like this: Array.prototype._AddGetterSetter("AddX", null, function(value) { this.push(value); }); [].AddX = "newItem";
interface Object { _AddGetterSetter: (name: string, getter: Function, setter: Function)=>void; }
Object.prototype._AddFunction("_AddGetterSetter", function(name, getter, setter) {
	//var name = (getter || setter).name || (getter || setter).toString().match(/^function\s*([^\s(]+)/)[1];
	if (name in this) delete this[name];
	if (name in this) return; // workaround for some properties not being deleted

	let info = {configurable: true, enumerable: false} as PropertyDescriptor;
	if (getter) info.get = getter;
	if (setter) info.set = setter;
	Object.defineProperty(this, name, info);
});

// the below lets you do stuff like this: Array.prototype._AddFunction_Inline = function AddX(value) { this.push(value); }; [].AddX = "newItem";
interface Object { _AddFunction_Inline: Function; }
Object.prototype._AddGetterSetter("_AddFunction_Inline", null, function(func) {
	this._AddFunction(func.GetName(), func);
});
interface Object { _AddGetter_Inline: Function; }
Object.prototype._AddGetterSetter("_AddGetter_Inline", null, function(func) {
	this._AddGetterSetter(func.GetName(), func, null);
});
interface Object { _AddSetter_Inline: Function; }
Object.prototype._AddGetterSetter("_AddSetter_Inline", null, function(func) {
	this._AddGetterSetter(func.GetName(), null, func);
});

// Function (early)
// ==========

//interface Function {
interface Object { // add to Object interface, otherwise TS thinks "Function" refers to this interface instead of the Function class
	GetName(): string;
	SetName(name: string): Function;
}

//Function.prototype._AddFunction_Inline = function GetName() { return this.name_fake || this.name || this.toString().match(/^function\s*([^\s(]+)/)[1]; };
Function.prototype._AddFunction("GetName", function() { return this.name_fake || this.name || (this.toString().match(/^function\s*([^\s(]+)/) || [])[1]; });
Function.prototype._AddFunction_Inline = function SetName(name: string) { this.name_fake = name; return this; };

// Object: C# polyfills/emulators
// ==================

/*Object.prototype._AddFunction_Inline = function SetBaseClass(baseClassFunc) {
	//this.prototype.__proto__ = baseClassFunc.prototype; // makes "(new ThisClass()) instanceof BaseClass" be true
	//Object.setPrototypeOf(this, baseClassFunc); // makes it easier to find base-classes from derived-class
	Object.setPrototypeOf(this.prototype, baseClassFunc.prototype); // makes "(new ThisClass()) instanceof BaseClass" be true

	//self.constructor = List; // makes "(new List()).constructor == List" be true

	var name = this.GetName();
	if (name != "")
		// this only runs on class constructor functions, so if function has name (i.e. name sucked in for self-knowledge purposes), create a variable by that name for global access
		window[name] = this;
};
Object.prototype._AddSetter_Inline = function SetAsBaseClassFor(derivedClassFunc) {
	derivedClassFunc.SetBaseClass(this);
	//window[derivedClassFunc.GetName()] = derivedClassFunc;
};
Object.prototype._AddFunction_Inline = function CallBaseConstructor(constructorArgs___) {
	//return this.prototype.__proto__.apply(this, V.AsArray(arguments));
	//this.__proto__.__proto__.constructor.apply(this, V.AsArray(arguments));
    var derivedClassFunc = arguments.callee.caller;
	derivedClassFunc.prototype.__proto__.constructor.apply(this, V_.AsArray(arguments));
	return this;
};
Object.prototype._AddFunction_Inline = function CallBaseConstructor_Manual(derivedClassFunc, constructorArgs___) {
	derivedClassFunc.prototype.__proto__.constructor.apply(this, V_.AsArray(arguments));
	return this;
};*/

// probably temp; helper so "p" function is usable on objects that aren't Node's (e.g. to declare property types)
/*Object.prototype._AddFunction_Inline = function AddHelpers(obj) {
	this.p = Node_p;
	return this;
};*/

Object.prototype._AddFunction_Inline = function GetVDFTypeInfo() { return VDFTypeInfo.Get(this.constructor); };

Object.prototype._AddFunction_Inline = function GetTypeName(vdfType = true) { //, simplifyForVScriptSystem)
	/*var result = this.constructor.name;
	if (allowProcessing) 	{
		if (result == "String")
			result = "string";
		else if (result == "Boolean")
			result = "bool";
		else if (result == "Number")
			result = this.toString().Contains(".") ? "double" : "int";
	}
	return result;*/

	/*var result = vdfTypeName ? VDF.GetTypeNameOfObject(this) : this.constructor.name;
	//if (simplifyForVScriptSystem)
	//	result = SimplifyTypeName(result);
	return result;*/
	if (vdfType) {
		/*if (this instanceof Multi)
			return "Multi(" + this.itemType + ")";*/
		return VDF.GetTypeNameOfObject(this);
	}
	return this.constructor.name;
};
/*Object.prototype._AddFunction_Inline = function GetType(vdfType = true, simplifyForVScriptSystem = false) {
    var result = Type(this.GetTypeName(vdfType));
    if (simplifyForVScriptSystem)
        result = SimplifyType(result);
    return result;
};*/

// Object: normal
// ==================

//Object.prototype._AddSetter_Inline = function ExtendWith_Inline(value) { this.ExtendWith(value); };
//Object.prototype._AddFunction_Inline = function ExtendWith(value) { $.extend(this, value); };
/*Object.prototype._AddFunction_Inline = function GetItem_SetToXIfNull(itemName, /*;optional:*#/ defaultValue) {
	if (!this[itemName])
		this[itemName] = defaultValue;
	return this[itemName];
};*/

// must also do it on window/global, for some reason
g.Extend = function(x) {
	for (var name in x) {
		var value = x[name];
		//if (value !== undefined)
        this[name] = value;
    }
	return this;
};

interface Object { Extend: (obj)=>void; }
Object.prototype._AddFunction_Inline = function Extend(x) {
	for (var name in x) {
		var value = x[name];
		//if (value !== undefined)
        this[name] = value;
    }
	return this;
};

// as replacement for C#'s "new MyClass() {prop = true}"
// seems this should work, to be consistent with in-class usage, but whatever; below it's an alternative that works for interfaces
//interface Object { VSet(props: any): this; }
interface Object {
	VSet<T>(this: T, props: any, defineProp_info?: PropertyDescriptor): T;
	VSet<T>(this: T, propName: string, propValue, defineProp_info?: PropertyDescriptor): T;
}
Object.prototype._AddFunction_Inline = function VSet(...args) {
	let props, defineProp_info: PropertyDescriptor, propName: string, propValue: string;
	if (typeof args[0] == "object") [props, defineProp_info] = args;
	else [propName, propValue, defineProp_info] = args;

	const SetProp = (name, value)=> {
		if (defineProp_info) {
			Object.defineProperty(this, name, Object.assign({configurable: true}, defineProp_info, {value: props[name]}));
		} else {
			this[name] = props[name];
		}
	};
	if (props) {
		for (var name in props) {
			SetProp(name, props[name]);
		}
	} else {
		SetProp(propName, propValue);
	}
	return this;
};
interface Object { Extended<T, T2>(this: T, x: T2): T & T2; }
Object.prototype._AddFunction_Inline = function Extended(x) {
	var result = {};
	for (var name in this)
		result[name] = this[name];
	if (x) {
    	for (var name in x)
    		result[name] = x[name];
	}
    return result;
};
/*interface Object { Extended2<T>(this, x: T): T; }
Object.prototype._AddFunction_Inline = function Extended2(x) {
	return this.Extended(x);
};*/
//Object.prototype._AddFunction_Inline = function E(x) { return this.Extended(x); };

interface Object { VAct<T>(this: T, func: (self: T)=>any): T; }
Object.prototype._AddFunction_Inline = function VAct(action) {
	action.call(this, this);
	return this;
};

interface Object { As<T>(type: new(..._)=>T): T; }
Object.prototype._AddFunction_Inline = function As<T>(type: new(..._)=>T) {
	Object.setPrototypeOf(this, type.prototype);
	return this as T;
};

interface Object { Including(...propNames: string[]): Object; }
Object.prototype._AddFunction_Inline = function Including(...propNames) {
	var result = {};
	for (let propName of propNames) {
		if (propName in this) {
			result[propName] = this[propName];
		}
	}
	return result;
}
interface Object { Excluding(...propNames: string[]): Object; }
Object.prototype._AddFunction_Inline = function Excluding(...propNames) {
    var result = this.Extended();
    for (let propName of propNames)
        delete result[propName];
    return result;
}

let specialProps = ["_", "_key", "_id"];

interface Object { Props(excludeSpecialProps?: boolean): {index: number, name: string, value: any}[]; }
Object.prototype._AddFunction_Inline = function Props(excludeSpecialProps = false) {
	var result = [];
	var i = 0;
	for (var propName in this) {
		if (excludeSpecialProps && (propName == "_" || propName == "_key" || propName == "_id")) continue;
		//result.push({index: i++, key: propName, name: propName, value: this[propName]});
		result.push({index: i++, name: propName, value: this[propName]});
	}
	return result;
};
interface Object { VKeys(excludeSpecialProps?: boolean): string[]; }
Object.prototype._AddFunction_Inline = function VKeys(excludeSpecialProps = false) {
	//if (excludeSpecialProps) return this.Props(true).map(a=>a.name);
	if (excludeSpecialProps) return Object.keys(this).Except(specialProps);
	return Object.keys(this);
};
//interface Object { VValues(excludeSpecialProps?: boolean): any[]; }
interface Object { VValues<T>(this: {[key: number]: T} | {[key: string]: T}, excludeSpecialProps?: boolean): T[]; }
Object.prototype._AddFunction_Inline = function VValues(excludeSpecialProps = false) {
	//if (excludeSpecialProps) return this.Props(true).map(a=>a.value);
	if (excludeSpecialProps) return Object.keys(this).Except(specialProps).map(a=>this[a]);
	return Object.keys(this).map(a=>this[a]);
};

// this is a total hack : P -- fixes typescript-es2017 "TypeError: [module].default is not a constructor" issue
/*Object.prototype._AddGetterSetter("default", function() {
	return this;
}, function(value) {
	/*delete this.default;
	this.default = value;*#/
	Object.defineProperty(this, "default", {configurable: true, enumerable: false, value});
});*/

// Object[FakeArray]
// ==========

interface Object { FA_Select<T, T2>(this: {[key: number]: T} | {[key: string]: T}, selectFunc?: (item: T, index?: number)=>T2): T2[]; }
Object.prototype._AddFunction_Inline = function FA_Select(selectFunc = a=>a) {
	g.Assert(!(this instanceof Array), "Cannot call FakeArray methods on a real array!");
	/*var result = this instanceof List ? new List(this.itemType) : [];
	for (let [index, item] of this.entries())
		result.Add(selectFunc.call(item, item, index));
	return result;*/
	return this.VValues(true).map(selectFunc);
};
interface Object { FA_RemoveAt(index: number); }
Object.prototype._AddFunction_Inline = function FA_RemoveAt(index: number) {
	g.Assert(!(this instanceof Array), "Cannot call FakeArray methods on a real array!");
	if (!(index in this)) return;
	// remove target entry
	delete this[index];
	// move all the later entries down one index
	for (var i = index + 1; i in this; i++)
		this[i - 1] = this[i];
	delete this[i - 1]; // remove the extra copy of the last-item 
};
interface Object { FA_Add<T>(this: {[key: number]: T} | {[key: string]: T}, item: T); }
Object.prototype._AddFunction_Inline = function FA_Add(item) {
	g.Assert(!(this instanceof Array), "Cannot call FakeArray methods on a real array!");
	for (var openIndex = 0; openIndex in this; openIndex++);
	this[openIndex] = item;
};

// Function
// ==========

Function.prototype._AddFunction_Inline = function AddTag(tag) {
	if (this.tags == null)
		this.tags = [];
	this.tags.push(tag);
	return this;
};
/*Function.prototype._AddFunction_Inline = function AddTags(/*o:*#/ tags___) { // (already implemented in VDF.js file)
	if (this.tags == null)
		this.tags = [];
	for (var i in arguments)
		this.tags.push(arguments[i]);
	return this;
};*/
/*function AddTags() {
	var tags = V.Slice(arguments, 0, arguments.length - 1);
	var func = V.Slice(arguments).Last();
	func.AddTags.apply(func, tags);
};*/
Function.prototype._AddFunction_Inline = function GetTags(/*o:*/ type) {
	return (this.tags || []).Where(a=>type == null || a instanceof type);
};

//Function.prototype._AddFunction_Inline = function AsStr(...args) { return require("../V/V").Multiline(this, ...args); };
Function.prototype._AddFunction_Inline = function AsStr(useExtraPreprocessing) { return require("../V/V").Multiline(this, useExtraPreprocessing); };

Function.prototype._AddFunction_Inline = function RunThenReturn(args___) { this.apply(null, arguments); return this; };

// Date
// ==========

interface Date { readonly MonthDate: Date; }
Date.prototype._AddGetter_Inline = function MonthDate() {
	return new Date(this.getFullYear(), this.getMonth(), 1);
};

function isLeapYear(year) {
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)); 
};
interface Date { isLeapYear: ()=>boolean; }
Date.prototype.isLeapYear = function() { 
    return isLeapYear(this.getFullYear()); 
};
function getDaysInMonth(year, month) {
    return [31, (isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};
interface Date { getDaysInMonth: ()=>number; }
Date.prototype.getDaysInMonth = function() { 
    return getDaysInMonth(this.getFullYear(), this.getMonth());
};

interface Date { AddMonths: (value: number)=>void; }
Date.prototype.AddMonths = function(value) {
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
};

interface Date { Clone: ()=>Date; }
Date.prototype.Clone = function() {
	return new Date(this.getTime());
}

// [offset construct] (e.g. {left: 10, top: 10})
// ==========

Object.prototype._AddFunction_Inline = function plus(offset) { return { left: this.left + offset.left, top: this.top + offset.top }; };

// Error
// ==========

interface Error { readonly Stack: string; }

// Node
// ==========

//(()=> {
HTMLElement.prototype._AddGetter_Inline = function R() { return g.FindReact(this); };
//})();

// require other CE modules
// ==========

require("./ClassExtensions/CE_Number");
require("./ClassExtensions/CE_String");
require("./ClassExtensions/CE_Array");

// late-require things from other modules, that are used in the methods
// ==========

// use "require" instead, so doesn't make TS see this as an external module (and thus disable interface extension)
// use alternate names, so doesn't get used in other files
//var V_ = require("../V/V").default;
//var {IsNumberString_} = require("./Globals");
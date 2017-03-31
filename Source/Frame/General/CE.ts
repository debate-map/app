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
		if (this[name])
			delete this[name];
		if (!this[name] || forceAdd) { // workaround for some properties not being deleted
			Object.defineProperty(this, name, {
				configurable: true, // for some reason, we get an error otherwise in non-dev mode (same for below)
				enumerable: false,
				value: value
			});
			/*if (this[name] == null)
				throw new Error(`Failed to add property "${name}" to type "${this}".`);*/
		}
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
	if (this[name])
		delete this[name];
	if (!this[name]) // workaround for some properties not being deleted
		if (getter && setter)
			Object.defineProperty(this, name, {configurable: true, enumerable: false, get: getter, set: setter});
		else if (getter)
			Object.defineProperty(this, name, {configurable: true, enumerable: false, get: getter});
		else
			Object.defineProperty(this, name, {configurable: true, enumerable: false, set: setter});
});

// the below lets you do stuff like this: Array.prototype._AddFunction_Inline = function AddX(value) { this.push(value); }; [].AddX = "newItem";
// maybe make-so: these use func.GetName()
interface Object { _AddFunction_Inline: Function; }
Object.prototype._AddGetterSetter("_AddFunction_Inline", null, function(func) {
	this._AddFunction(func.name_fake || func.name, func);
});
interface Object { _AddGetter_Inline: Function; }
Object.prototype._AddGetterSetter("_AddGetter_Inline", null, function(func) {
	this._AddGetterSetter(func.name_fake || func.name, func, null);
});
interface Object { _AddSetter_Inline: Function; }
Object.prototype._AddGetterSetter("_AddSetter_Inline", null, function(func) {
	this._AddGetterSetter(func.name_fake || func.name, null, func);
});

// alias for _AddFunction_Inline, since now we need to add functions to the "window" object relatively often
//Object.prototype._AddGetterSetter("AddFunc", null, function(func) { this._AddFunction(func.name, func); });

// Function (early)
// ==========

//interface Function {
interface Object { // add to Object interface, otherwise TS thinks "Function" refers to this interface instead of the Function class
	GetName(): string;
	SetName(name: string): Function;
}

//Function.prototype._AddFunction_Inline = function GetName() { return this.name || this.name_fake || this.toString().match(/^function\s*([^\s(]+)/)[1]; };
Function.prototype._AddFunction_Inline = function GetName() { return this.name_fake || this.name || this.toString().match(/^function\s*([^\s(]+)/)[1]; };
Function.prototype._AddFunction_Inline = function SetName(name: string) { this.name_fake = name; return this; };
// probably make-so: SetName_Temp function exists
//Function.prototype._AddFunction_Inline = function Call_Silent(self) { this.apply(self, V.Slice(arguments, 1)); return this; }
//Function.prototype._AddFunction_Inline = function Call_Silent() { this.apply(this, arguments); return this; }

// Object: C# polyfills/emulators
// ==================

/*Object.prototype._AddGetterSetter("AddMethod", null, function(func) { // for steamlined prototype-method-adding, that doesn't overwrite the method if it already exists (maybe just for use in this project)
	if (this.prototype[func.GetName()] == null)
		this._AddFunction(func.GetName(), func);
});*/
Object.prototype._AddSetter_Inline = function AddMethod(func) { // for steamlined prototype-method-adding, that doesn't overwrite the method if it already exists (maybe just for use in this project)
	if (this[func.GetName()] == null)
		this._AddFunction(func.GetName(), func);
};
// maybe temp; shorthand version (i.e.: p.method = function MethodName() {};)
/*Object.prototype._AddSetter_Inline = function method(func) //Method, add, Add,
{
	if (this[func.GetName()] == null)
		this._AddFunction(func.GetName(), func);
};*/

Object.prototype._AddFunction_Inline = function SetBaseClass(baseClassFunc) {
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
};

// probably temp; helper so "p" function is usable on objects that aren't Node's (e.g. to declare property types)
/*Object.prototype._AddFunction_Inline = function AddHelpers(obj) {
	this.p = Node_p;
	return this;
};*/

//Object.prototype._AddFunction_Inline = function GetVDFTypeInfo() { return VDFTypeInfo.Get(this.GetTypeName()); };
//Object.prototype._AddFunction_Inline = function GetVDFTypeInfo() { return VDFTypeInfo.Get(this.GetType()); };
Object.prototype._AddFunction_Inline = function GetVDFTypeInfo() { return VDFTypeInfo.Get(this.constructor); };

//Object.prototype._AddFunction_Inline = function GetType() { return this.constructor; };
Object.prototype._AddFunction_Inline = function GetTypeName(vdfType = true) { //, simplifyForVScriptSystem)
	/*var result = this.constructor.name;
	if (allowProcessing) 	{
		if (result == "String")
			result = "string";
		else if (result == "Boolean")
			result = "bool";
		else if (result == "Number")
			result = this.toString().contains(".") ? "double" : "int";
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

/*import V from "../Packages/V/V";
import {GetTypeName, IsNumberString, SimplifyType} from "./Globals";
import {max, min} from "moment";*/

// Object: normal
// ==================

//Object.prototype._AddSetter_Inline = function ExtendWith_Inline(value) { this.ExtendWith(value); };
//Object.prototype._AddFunction_Inline = function ExtendWith(value) { $.extend(this, value); };
/*Object.prototype._AddFunction_Inline = function GetItem_SetToXIfNull(itemName, /*;optional:*#/ defaultValue) {
	if (!this[itemName])
		this[itemName] = defaultValue;
	return this[itemName];
};*/
//Object.prototype._AddFunction_Inline = function CopyXChildrenAsOwn(x) { $.extend(this, x); };
//Object.prototype._AddFunction_Inline = function CopyXChildrenToClone(x) { return $.extend($.extend({}, this), x); };

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
//interface Object { Init: (obj)=>Object; }
// seems this should work, to be consistent with in-class usage, but whatever; below it's an alternative that works for interfaces
//interface Object { Init(obj: any): this; }
interface Object { Init<T>(this: T, obj: any): T; }
Object.prototype._AddFunction_Inline = function Init(x) { return this.Extend(x); };

interface Object { Get(propName: any): any; }
Object.prototype._AddFunction_Inline = function Get(propName) { return this[propName]; };
interface Object { VSet<T>(this: T, obj: any): T; }
Object.prototype._AddFunction_Inline = function VSet(other) {
	for (var name in other)
        this[name] = other[name];
	return this;
};

interface Object { Extended<T>(this: T, x): T; }
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
interface Object { Extended2<T>(this, x: T): T; }
Object.prototype._AddFunction_Inline = function Extended2(x) {
	return this.Extended(x);
};
//Object.prototype._AddFunction_Inline = function E(x) { return this.Extended(x); };

interface Object { Including(...propNames: string[]): Object; }
Object.prototype._AddFunction_Inline = function Including(...propNames) {
    var result = {};
    for (let propName of propNames)
        result[propName] = this[propName];
    return result;
}
interface Object { Excluding(...propNames: string[]): Object; }
Object.prototype._AddFunction_Inline = function Excluding(...propNames) {
    var result = this.Extended();
    for (let propName of propNames)
        delete result[propName];
    return result;
}

/*Object.prototype._AddFunction_Inline = function Keys() {
	var result = [];
	for (var key in this)
		if (this.hasOwnProperty(key))
			result.push(key);
	return result;
};*/
//Object.prototype._AddFunction_Inline = function Keys() { return Object.keys(this); }; // "Keys" is already used for Dictionary prop
//Object.prototype._AddGetter_Inline = function VKeys() { return Object.keys(this); }; // "Keys" is already used for Dictionary prop

// "Keys" is already used for Dictionary prop
interface Object { VKeys(): string[]; }
Object.prototype._AddFunction_Inline = function VKeys() { return Object.keys(this); };
/*interface Object { VKeys(excludeKeyAndID?: boolean): string[]; }
Object.prototype._AddFunction_Inline = function VKeys(excludeKeyAndID = true) {
	return Object.keys(this).Except("_key", "_id");
};*/

interface Object { VValues(): any[]; }
Object.prototype._AddFunction_Inline = function VValues() { return Object.keys(this).Select(a=>this[a]); };
// like Pairs for Dictionary, except for Object
interface Object { readonly Props: {index: number, name: string, value: any}[]; }
Object.prototype._AddGetter_Inline = function Props() {
	var result = [];
	var i = 0;
	for (var propName in this)
		//result.push({index: i++, key: propName, name: propName, value: this[propName]});
		result.push({index: i++, name: propName, value: this[propName]});
	return result;
};
/*Object.defineProperty(Object.prototype, "Keys", {
	enumerable: false,
	configurable: true,
	get: function() { return Object.keys(this); }
	//get: Object.keys
});*/
/*Object.prototype._AddGetter_Inline = function Items() {
	var result = [];
	for (var key in this)
		if (this.hasOwnProperty(key))
			result.push(this[key]);
	return result;
};*/
//Object.prototype._AddFunction_Inline = function ToJson() { return JSON.stringify(this); };

Object.prototype._AddFunction_Inline = function AddProp(name, value) {
	this[name] = value;
	return this;
};
interface Object { _Set: (name: string, value)=>void; }
Object.prototype._AddFunction_Inline = function _Set(name, value) {
	Object.defineProperty(this, name, {
		configurable: true, // for some reason, we get an error otherwise in non-dev mode (same for below)
		//enumerable: false,
		value
	});
};

/*Object.prototype._AddFunction_Inline = function GetVSData(context) {
	this[name] = value;
	return this;
};*/

Object.prototype._AddFunction_Inline = function VAct(action) {
	action.call(this);
	return this;
};

interface Object { As<T>(type: new(..._)=>T): T; }
Object.prototype._AddFunction_Inline = function As<T>(type: new(..._)=>T) {
	Object.setPrototypeOf(this, type.prototype);
	return this as T;
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

Function.prototype._AddFunction_Inline = function AsStr(args___) { return V_.Multiline.apply(null, [this].concat(V_.AsArray(arguments))); };

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

// require other CE modules
// ==========

require("./ClassExtensions/CE_Number");
require("./ClassExtensions/CE_String");
require("./ClassExtensions/CE_Array");

// late-require things from other modules, that are used in the methods
// ==========

// use "require" instead, so doesn't make TS see this as an external module (and thus disable interface extension)
// use alternate names, so doesn't get used in other files
var V_ = require("../V/V").default;
//var {IsNumberString_} = require("./Globals");
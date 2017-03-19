// ClassExtensions.ts
// ==========

var {VDF} = require("../Serialization/VDF/VDF");
var {List, Dictionary} = require("../Serialization/VDF/VDFExtras");
var {VDFTypeInfo} = require("../Serialization/VDF/VDFTypeInfo");

// Object: base
// ==================

// the below lets you do stuff like this: Array.prototype._AddFunction(function AddX(value) { this.push(value); }); []._AddX("newItem");
interface Object { _AddItem: (name: string, func: Function)=>void; }
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
interface Object { VKeys(): string[]; }
Object.prototype._AddFunction_Inline = function VKeys() { return Object.keys(this); }; // "Keys" is already used for Dictionary prop
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

// Number
// ==========

interface Number { IfN1Then<T>(valIfSelfIsNeg1: T): T; }
Number.prototype._AddFunction_Inline = function IfN1Then(valIfSelfIsNeg1) {
	return this != -1 ? this : valIfSelfIsNeg1;
};

//Number.prototype._AddFunction_Inline = function RoundToMultipleOf(step) { return Math.round(new Number(this) / step) * step; }; //return this.lastIndexOf(str, 0) === 0; };
interface Number { ToPercentStr: (precision?: number)=>string; }
Number.prototype._AddFunction_Inline = function ToPercentStr(precision?: number) {
	let number = this * 100;
	if (precision != null)
		return number.toFixed(precision) + "%";
	return number.toString() + "%";
};
Number.prototype._AddFunction_Inline = function RoundToMultipleOf(step) {
	var integeredAndRounded = Math.round((new Number(this) as any) / step);
	var result = (integeredAndRounded * step).toFixed(step.toString().TrimStart("0").length); // - 1);
	if (result.contains("."))
		result = result.TrimEnd("0").TrimEnd(".");
	return result;
};

interface Number { KeepAtLeast: (min: number)=>number; }
Number.prototype._AddFunction_Inline = function KeepAtLeast(min) {
	return Math.max(min, this);
};
interface Number { KeepAtMost: (max: number)=>number; }
Number.prototype._AddFunction_Inline = function KeepAtMost(max) {
	return Math.min(max, this);
};
interface Number { KeepBetween: (min: number, max: number)=>number; }
Number.prototype._AddFunction_Inline = function KeepBetween(min, max) {
	return Math.min(max, Math.max(min, this));
};
interface Number { WrapToRange: (min: number, max: number, asInt?: boolean)=>number; }
Number.prototype._AddFunction_Inline = function WrapToRange(min, max, asInt = true) {
	let val = this;
	let size = asInt ? 1 + (max - min) : max - min;
	while (val < min) val += size;
	while (val > max) val -= size;
	return val;
};
Number.prototype._AddFunction_Inline = function Distance(other) {
	return Math.abs(this - other);
};

// String
// ==========

interface String { TrimEnd: (chars___)=>string; }
String.prototype.TrimEnd = function(chars___) {
	var chars = V_.Slice(arguments);

	var result = "";
	var doneTrimming = false;
	for (var i = this.length - 1; i >= 0; i--)
		if (!chars.Contains(this[i]) || doneTrimming) {
			result = this[i] + result;
			doneTrimming = true;
		}
	return result;
};

interface String { contains: (str)=>boolean; }
String.prototype._AddFunction_Inline = function contains(str, /*;optional:*/ startIndex) { return -1 !== String.prototype.indexOf.call(this, str, startIndex); };
String.prototype._AddFunction_Inline = function hashCode() {
	var hash = 0;
	for (var i = 0; i < this.length; i++) {
		var char = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0; // convert to 32-bit integer
	}
	return hash;
};
String.prototype._AddFunction_Inline = function Matches(strOrRegex) {
	if (typeof strOrRegex == "string") {
		var str = strOrRegex;
		var result = [];
		var lastMatchIndex = -1;
		while (true) {
			var matchIndex = this.indexOf(str, lastMatchIndex + 1);
			if (matchIndex == -1) // if another match was not found
				break;
			result.push({index: matchIndex});
			lastMatchIndex = matchIndex;
		}
		return result;
	}

	var regex = strOrRegex;
	if (!regex.global)
		throw new Error("Regex must have the 'g' flag added. (otherwise an infinite loop occurs)");

	var result = [];
	var match;
	while (match = regex.exec(this))
		result.push(match);
	return result;
};
/*String.prototype._AddFunction_Inline = function matches_group(regex, /*o:*#/ groupIndex) {
	if (!regex.global)
		throw new Error("Regex must have the 'g' flag added. (otherwise an infinite loop occurs)");

	groupIndex = groupIndex || 0; // default to the first capturing group
	var matches = [];
	var match;
	while (match = regex.exec(this))
		matches.push(match[groupIndex]);
	return matches;
};*/
interface String { IndexOf_X: (str: string, indexX: number)=>number; }
/** indexX is 0-based */
String.prototype._AddFunction_Inline = function IndexOf_X(str: string, indexX: number) {
	var currentPos = -1;
	for (var i = 0; i <= indexX; i++) {
		var subIndex = this.indexOf(str, currentPos + 1);
		if (subIndex == -1)
			return -1; // no such xth index
		currentPos = subIndex;
	}
	return currentPos;
};
interface String { IndexOf_X: (str: string, indexFromLastX: number)=>number; }
/** indexFromLastX is 0-based */
String.prototype._AddFunction_Inline = function IndexOf_XFromLast(str: string, indexFromLastX: number) {
	var currentPos = (this.length - str.length) + 1; // index just after the last-index-where-match-could-occur
	for (var i = 0; i <= indexFromLastX; i++) {
		var subIndex = this.lastIndexOf(str, currentPos - 1);
		if (subIndex == -1)
			return -1; // no such xth index
		currentPos = subIndex;
	}
	return currentPos;
};
interface String { IndexOfAny: (...strings: string[])=>number; }
String.prototype._AddFunction_Inline = function IndexOfAny(this: string, ...strings: string[]) {
	var lowestIndex = -1;
	for (let str of strings) {
		var indexOfChar = this.indexOf(str);
		if (indexOfChar != -1 && (indexOfChar < lowestIndex || lowestIndex == -1))
			lowestIndex = indexOfChar;
	}
	return lowestIndex;
};
interface String { LastIndexOfAny: (...strings: string[])=>number; }
String.prototype._AddFunction_Inline = function LastIndexOfAny(this: string, ...strings: string[]) {
	var highestIndex = -1;
	for (let str of strings) {
		var indexOfChar = this.lastIndexOf(str);
		if (indexOfChar > highestIndex)
			highestIndex = indexOfChar;
	}
	return highestIndex;
};
interface String { StartsWithAny: (...strings: string[])=>boolean; }
String.prototype._AddFunction_Inline = function StartsWithAny(this: string, ...strings: string[]) {
	return strings.Any(str=>this.startsWith(str));
};
interface String { EndsWithAny: (...strings: string[])=>boolean; }
String.prototype._AddFunction_Inline = function EndsWithAny(this: string, ...strings: string[]) {
	return strings.Any(str=>this.endsWith(str));
};
interface String { ContainsAny: (...strings: string[])=>boolean; }
String.prototype._AddFunction_Inline = function ContainsAny(this: string, ...strings: string[]) {
	return strings.Any(str=>this.contains(str));
};
String.prototype._AddFunction_Inline = function SplitByAny() {
    var args = arguments;
	if (args[0] instanceof Array)
		args = args[0];

	var splitStr = "/";
	for (var i = 0; i < args.length; i++)
		splitStr += (splitStr.length > 1 ? "|" : "") + args[i];
	splitStr += "/";

	return this.split(splitStr);
};
interface String { SplitAt: (index: number, includeCharAtIndex?)=>[string, string]; }
String.prototype.SplitAt = function(index: number, includeCharAtIndex = false) {
	if (index == -1) // if no split-index, pass source-string as part2 (makes more sense for paths and such)
		return ["", this];
	let part1 = this.substr(0, index);
	let part2 = includeCharAtIndex ? this.substr(index) : this.substr(index + 1);
	return [part1, part2];
};
String.prototype._AddFunction_Inline = function Splice(index, removeCount, insert) {
	return this.slice(0, index) + insert + this.slice(index + Math.abs(removeCount));
};
String.prototype._AddFunction_Inline = function Indent(indentCount) {
    var indentStr = "\t".repeat(indentCount);
    return this.replace(/^|(\n)/g, "$1" + indentStr);
};

// for firebase entry keys
interface String { readonly KeyToInt: number; }
String.prototype._AddGetter_Inline = function KeyToInt() {
	return parseInt((this as string).substr(1));
};
interface Number { readonly IntToKey: string; }
Number.prototype._AddGetter_Inline = function IntToKey() {
	return "e" + this;
};

interface String {
	/** Creates a function from "func", setting its name to the "this" string's value. */
	Func(func: Function): Function;
}
String.prototype._AddFunction_Inline = function Func(func) {
	func.SetName(this);
    return func;
};

// special; creates a function with the given name, but also caches it per caller-line,
//   so every call from that line returns the same function instance
// REMOVED, because: we need to create new funcs to capture new closure values
/*var oneFuncCache = {};
String.prototype._AddFunction_Inline = function OneFunc(func) {
    var funcName = this;
    var callerLineStr = new Error().stack.split("\n")[3];
    var funcKey = `${funcName}@${callerLineStr}`;
	if (oneFuncCache[funcKey] == null) {
		func.SetName(this);
	    //func.cached = true;
	    oneFuncCache[funcKey] = func;
	}
    return oneFuncCache[funcKey];
};*/

String.prototype._AddFunction_Inline = function AsMultiline() {
    return this.substring(this.indexOf("\n") + 1, this.lastIndexOf("\n"));
};

String.prototype._AddFunction_Inline = function Substring(start, end) {
    if (end < 0)
        end = this.length + end;
    return this.substring(start, end);
};

// Array
// ==========

interface Array<T> { Contains(item: T): boolean; }
//Array.prototype._AddFunction_Inline = function Contains(items) { return this.indexOf(items) != -1; };
Array.prototype._AddFunction_Inline = function ContainsAny(...items) {
    for (let item of items)
        if (this.indexOf(item) != -1)
            return true;
    return false;
};

// for some reason, this platform doesn't have entries() defined
Array.prototype._AddFunction_Inline = function entries() {
	var result = [];
	for (var i = 0; i < this.length; i++)
		result.push([i, this[i]]);
	return result;
};

Array.prototype._AddFunction_Inline = function Prepend(...newItems) { this.splice(0, 0, ...newItems); };
Array.prototype._AddFunction_Inline = function Add(item) { return this.push(item); };
Array.prototype._AddFunction_Inline = function CAdd(item) { this.push(item); return this; }; // CAdd = ChainAdd
Array.prototype._AddFunction_Inline = function TAdd(item) { this.push(item); return item; }; // TAdd = TransparentAdd
interface Array<T> { AddRange(items: T[]): this; }
Array.prototype._AddFunction_Inline = function AddRange(array) {
	this.push(...array);
	return this;
};
interface Array<T> { Remove(item: T): boolean; }
Array.prototype._AddFunction_Inline = function Remove(item) {
	/*for (var i = 0; i < this.length; i++)
		if (this[i] === item)
			return this.splice(i, 1);*/
	var itemIndex = this.indexOf(item);
	var removedItems = this.splice(itemIndex, 1);
	return removedItems.length > 0;
};
interface Array<T> { RemoveAll(items: T[]): void; }
Array.prototype._AddFunction_Inline = function RemoveAll(items) {
    for (let item of items)
        this.Remove(item);
};
interface Array<T> { RemoveAt(index: number): T; }
Array.prototype._AddFunction_Inline = function RemoveAt(index) { return this.splice(index, 1)[0]; };
interface Array<T> { Insert(index: number, obj: T): void; }
Array.prototype._AddFunction_Inline = function Insert(index, obj) { this.splice(index, 0, obj); }

interface Array<T> { Reversed(): T[]; }
Array.prototype._AddFunction_Inline = function Reversed() { 
	var clone = this.slice(0);
	clone.reverse();
	return clone;
}

//Object.prototype._AddFunction_Inline = function AsRef() { return new NodeReference_ByPath(this); }

// Linq replacements
// ----------

interface Array<T> { Any(matchFunc: (item: T, index?: number)=>boolean): boolean; }
Array.prototype._AddFunction_Inline = function Any(matchFunc) {
    for (let [index, item] of this.entries())
        if (matchFunc == null || matchFunc.call(item, item, index))
            return true;
    return false;
};
interface Array<T> { All(matchFunc: (item: T, index?: number)=>boolean): boolean; }
Array.prototype._AddFunction_Inline = function All(matchFunc) {
    for (let [index, item] of this.entries())
        if (!matchFunc.call(item, item, index))
            return false;
    return true;
};
interface Array<T> { Where(matchFunc: (item: T, index?: number)=>boolean): T[]; }
Array.prototype._AddFunction_Inline = function Where(matchFunc) {
	var result = this instanceof List ? new List(this.itemType) : [];
	for (let [index, item] of this.entries())
		if (matchFunc.call(item, item, index)) // call, having the item be "this", as well as the first argument
			result.Add(item);
	return result;
};
interface Array<T> { Select<T2>(matchFunc: (item: T, index?: number)=>T2): T2[]; }
Array.prototype._AddFunction_Inline = function Select(selectFunc) {
	var result = this instanceof List ? new List(this.itemType) : [];
	for (let [index, item] of this.entries())
		result.Add(selectFunc.call(item, item, index));
	return result;
};
interface Array<T> { SelectMany<T2>(matchFunc: (item: T, index?: number)=>T2[]): T2[]; }
Array.prototype._AddFunction_Inline = function SelectMany(selectFunc) {
	var result = this instanceof List ? new List(this.itemType) : [];
	for (let [index, item] of this.entries())
		result.AddRange(selectFunc.call(item, item, index));
	return result;
};
//Array.prototype._AddFunction_Inline = function Count(matchFunc) { return this.Where(matchFunc).length; };
//Array.prototype._AddFunction_Inline = function Count(matchFunc) { return this.Where(matchFunc).length; }; // needed for items to be added properly to custom classes that extend Array
Array.prototype._AddGetter_Inline = function Count() { return this.length; }; // needed for items to be added properly to custom classes that extend Array
interface Array<T> { VCount(matchFunc: (item: T)=>boolean): number; }
Array.prototype._AddFunction_Inline = function VCount(matchFunc) { return this.Where(matchFunc).length; };
interface Array<T> { Clear(): void; }
Array.prototype._AddFunction_Inline = function Clear() {
	/*while (this.length > 0)
		this.pop();*/
    this.splice(0, this.length);
};
interface Array<T> { First(matchFunc?: (item: T, index: number)=>boolean): T; }
Array.prototype._AddFunction_Inline = function First(matchFunc?) {
	var result = this.FirstOrX(matchFunc);
	if (result == null)
		throw new Error("Matching item not found.");
	return result;
}
interface Array<T> { FirstOrX(matchFunc?: (item: T, index: number)=>boolean, x?): T; }
Array.prototype._AddFunction_Inline = function FirstOrX(matchFunc?, x = null) {
	if (matchFunc) {
		for (let [index, item] of this.entries()) {
			if (matchFunc.call(item, item, index))
				return item;
		}
	} else if (this.length > 0)
		return this[0];
	return x;
}
//Array.prototype._AddFunction_Inline = function FirstWithPropValue(propName, propValue) { return this.Where(function() { return this[propName] == propValue; })[0]; };
Array.prototype._AddFunction_Inline = function FirstWith(propName, propValue) { return this.Where(function() { return this[propName] == propValue; })[0]; };
interface Array<T> { Last(matchFunc?: (item: T, index: number)=>boolean): T; }
Array.prototype._AddFunction_Inline = function Last(matchFunc?) {
	var result = this.LastOrX(matchFunc);
	if (result == null)
		throw new Error("Matching item not found.");
	return result;
}
interface Array<T> { LastOrX(matchFunc?: (item: T, index: number)=>boolean, x?): T; }
Array.prototype._AddFunction_Inline = function LastOrX(matchFunc?, x = null) {
	if (matchFunc) {
		for (var i = this.length - 1; i >= 0; i--) {
			if (matchFunc.call(this[i], this[i], i))
				return this[i];
		}
	} else if (this.length > 0)
		return this[this.length - 1];
	return x;
}
Array.prototype._AddFunction_Inline = function XFromLast(x) { return this[(this.length - 1) - x]; };

// since JS doesn't have basic "foreach" system
Array.prototype._AddFunction_Inline = function ForEach(func) {
	for (var i in this)
		func.call(this[i], this[i], i); // call, having the item be "this", as well as the first argument
};

Array.prototype._AddFunction_Inline = function Move(item, newIndex) {
	var oldIndex = this.indexOf(item);
	this.RemoveAt(oldIndex);
	if (oldIndex < newIndex) // new-index is understood to be the position-in-list to move the item to, as seen before the item started being moved--so compensate for remove-from-old-position list modification
		newIndex--;
	this.Insert(newIndex, item);
};

Array.prototype._AddFunction_Inline = function ToList(itemType = null) {
	if (this instanceof List)
		return List.apply(null, [itemType || "object"].concat(this));
    return [].concat(this);
}
Array.prototype._AddFunction_Inline = function ToDictionary(keyFunc, valFunc) {
	var result = new Dictionary();
	for (var i in this)
		result.Add(keyFunc(this[i]), valFunc(this[i]));
	return result;
}
interface Array<T> { ToMap(keyFunc: (item: T)=>string, valFunc: (item: T)=>any): any; }
Array.prototype._AddFunction_Inline = function ToMap(keyFunc, valFunc) {
	var result = {};
	for (let item of this)
		result[keyFunc(item)] = valFunc(item);
	return result;
}
interface Array<T> { Skip(count: number): T[]; }
Array.prototype._AddFunction_Inline = function Skip(count) {
	var result = [];
	for (var i = count; i < this.length; i++)
		result.push(this[i]);
	return result;
};
interface Array<T> { Take(count: number): T[]; }
Array.prototype._AddFunction_Inline = function Take(count) {
	var result = [];
	for (var i = 0; i < count && i < this.length; i++)
		result.push(this[i]);
	return result;
};
Array.prototype._AddFunction_Inline = function TakeLast(count) {
	var result = [];
	for (var i = 0; i < count && (this.length - 1) - i >= 0; i++)
		result.push(this[(this.length - 1) - i]);
	return result;
};
interface Array<T> { FindIndex(matchFunc?: (item: T, index: number)=>boolean): number; }
Array.prototype._AddFunction_Inline = function FindIndex(matchFunc) {
	for (let [index, item] of this.entries()) {
		if (matchFunc.call(item, item, index)) // call, having the item be "this", as well as the first argument
			return index;
	}
	return -1;
};
/*Array.prototype._AddFunction_Inline = function FindIndex(matchFunc) {
    for (let [index, item] of this.entries())
        if (matchFunc.call(item, item))
            return index;
    return -1;
};*/
interface Array<T> { OrderBy(valFunc?: (item: T)=>number): T[]; }
Array.prototype._AddFunction_Inline = function OrderBy(valFunc = a=>a) {
	/*var temp = this.ToList();
	temp.sort((a, b)=>V.Compare(valFunc(a), valFunc(b)));
	return temp;*/
    return V_.StableSort(this, (a, b)=>V_.Compare(valFunc(a), valFunc(b)));
};
interface Array<T> { Distinct(): T[]; }
Array.prototype._AddFunction_Inline = function Distinct() {
	var result = [];
	for (var i in this)
		if (!result.Contains(this[i]))
			result.push(this[i]);
	return result;
};
interface Array<T> {
	Except(...excludeItems: T[]): T[];
}
Array.prototype._AddFunction_Inline = function Except(...excludeItems) {
	return this.Where(a=>!excludeItems.Contains(a));
};

//Array.prototype._AddFunction_Inline = function JoinUsing(separator) { return this.join(separator);};
interface Array<T> { Min(valFunc?: (item: T)=>number): T; }
Array.prototype._AddFunction_Inline = function Min(valFunc = a=>a) {
    return this.OrderBy(valFunc).First();
};
interface Array<T> { Max(valFunc?: (item: T)=>number): T; }
Array.prototype._AddFunction_Inline = function Max(valFunc = a=>a) {
    return this.OrderBy(valFunc).Last();
};
Array.prototype._AddFunction_Inline = function Sum() {
    var total = 0;
	for (let item of this)
		total += item;
	return total;
};
Array.prototype._AddFunction_Inline = function Average() {
    var total = this.Sum();
	return total / this.length;
};
Array.prototype._AddFunction_Inline = function Median() {
    var ordered = this.OrderBy(a=>a);
	if (this.length % 2 == 0) // if even number of elements, average two middlest ones
		return ordered[(this.length / 2) - 1] + ordered[this.length / 2];
	return ordered[this.length / 2]; // otherwise, return the exactly-middle one
};

// ArrayIterator
// ==========

/*var ArrayIterator = [].entries().constructor;
ArrayIterator.prototype._AddFunction_Inline = function ToArray() {
    return Array.from(this);
};*/

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

// late-require things from other modules, that are used in the methods
// ==========

// use "require" instead, so doesn't make TS see this as an external module (and thus disable interface extension)
// use alternate names, so doesn't get used in other files
var V_ = require("../V/V").default;
var {IsNumberString_} = require("./Globals");
import {VDFSaver, VDFSaveOptions} from "./VDFSaver";
import {VDFLoadOptions, VDFLoader} from "./VDFLoader";
import {List, ConvertObjectTypeNameToVDFTypeName} from "./VDFExtras";
import {
    VDFDeserialize,
    VDFDeserializeProp,
    VDFPostDeserialize,
    VDFPostSerialize,
    VDFPreDeserialize,
    VDFPreSerialize,
    VDFProp,
    VDFPropInfo,
    VDFSerialize,
    VDFSerializeProp,
    VDFType,
    VDFTypeInfo
} from "./VDFTypeInfo";
// vdf globals
// ==========

var g = window as any;
export function Log(...args) {
	if (g.Log)
		return g.Log(...args);
	return (console.log as any)(...args);
}
export function Assert(condition, message) {
	if (condition) return;
	console.assert(false, message || "");
	debugger;
}

// init
// ==========

declare global {
	interface Object {
		_AddProperty(name: string, value): void;
	}
}
// the below lets you easily add non-enumerable properties
Object.defineProperty(Object.prototype, "_AddProperty", {
	enumerable: false,
	value: function(name, value) {
		if (name in this) return; // don't overwrite existing properties (since this is just a library)
		Object.defineProperty(this, name, {
			configurable: true,
			enumerable: false,
			value: value
		});
	}
});

declare global {
	interface String {
		Contains(str: string): boolean;
		StartsWith(str: string): boolean;
		EndsWith(str: string): boolean;
		TrimStart(chars: Array<string>): string;
	}
}
String.prototype._AddProperty("Contains", function(str) { return this.indexOf(str) != -1; });
String.prototype._AddProperty("StartsWith", function(str) { return this.indexOf(str) == 0; });
String.prototype._AddProperty("EndsWith", function(str) {
	var expectedPos = this.length - str.length;
	return this.indexOf(str, expectedPos) == expectedPos;
});
String.prototype._AddProperty("TrimStart", function(chars: Array<string>) {
	var result = "";
	var doneTrimming = false;
	for (var i = 0; i < this.length; i++)
		if (!chars.Contains(this[i]) || doneTrimming) {
			result += this[i];
			doneTrimming = true;
		}
	return result;
});

declare global {
	interface Array<T> {
		Contains(obj: T): boolean;
		Where(matchFunc: (item: T, index: number)=>boolean): T[];
		//First(matchFunc: (item: T, index: number)=>boolean, requireMatch: boolean): T;
	}
}
if (!Array.prototype["Contains"])
	Array.prototype._AddProperty("Contains", function(item) { return this.indexOf(item) != -1; });
if (!Array.prototype["Where"])
	Array.prototype._AddProperty("Where", function(matchFunc = (()=>true)) {
		var result: any = this instanceof List ? new List(this.itemType) : [];
		for (let item of this)
			if (matchFunc.call(item, item)) // call, having the item be "this", as well as the first argument
				result.push(item);
		return result;
	});
/*if (!Array.prototype["First"]) {
	Array.prototype._AddProperty("First", function(matchFunc = (()=>true), requireMatch?) {
		if (matchFunc) {
			for (let [index, item] of this.Entries) {
				if (matchFunc.call(item, item, index))
					return item;
			}
		} else if (this.length > 0)
			return this[0];
		if (requireMatch)
			throw new Error("Matching item not found.");
	});
}*/

declare global {
	interface Function {
		AddTags(...tags: any[]): string;
		//IsDerivedFrom(baseType: Function): boolean;
	}
}
Function.prototype._AddProperty("AddTags", function(...tags) {
	if (this.tags == null)
		this.tags = new List("object");
	for (var i = 0; i < tags.length; i++)
		this.tags.push(tags[i]);
	return this;
});
/*Function.prototype._AddProperty("IsDerivedFrom", function(baseType) {
	if (baseType == null)
		return false;
	var currentDerived = this.prototype;
	while (currentDerived.__proto__)	{
		if (currentDerived == baseType.prototype)
			return true;
		currentDerived = currentDerived.__proto__;
	}
	return false;
});*/

export class VDF {
	// for use with VDFSaveOptions
	static AnyMember: string = "#AnyMember";
	static AllMembers: string[] = ["#AnyMember"];

	// for use with VDFType
	static PropRegex_Any = ""; //"^.+$";

	// for use with VDFSerialize/VDFDeserialize methods
	//static Undefined; //= new VDFNode(); // JS doesn't need this; it just uses its native "undefined" pseudo-keyword
	static CancelSerialize; //= new VDFNode();

	// v-name examples: "List(string)", "System.Collections.Generic.List(string)", "Dictionary(string string)"
	static GetGenericArgumentsOfType(typeName: string): string[] {
		var genericArgumentTypes = new Array<string>(); //<string[]>[];
		var depth = 0;
		var lastStartBracketPos = -1;
		if (typeName != null)
			for (var i = 0; i < typeName.length; i++) {
				var ch = typeName[i];
				if (ch == ')')
					depth--;
				if ((depth == 0 && ch == ')') || (depth == 1 && ch == ' '))
					genericArgumentTypes.push(typeName.substring(lastStartBracketPos + 1, i)); // get generic-parameter type-str
				if ((depth == 0 && ch == '(') || (depth == 1 && ch == ' '))
					lastStartBracketPos = i;
				if (ch == '(')
					depth++;
			}
		return genericArgumentTypes;
	}
	static IsTypeXDerivedFromY(xTypeName: string, yTypeName: string) {
		if (xTypeName == null || yTypeName == null || window[xTypeName] == null || window[yTypeName] == null)
			return false;
		var currentDerived = window[xTypeName].prototype;
		while (currentDerived.__proto__) {
			if (currentDerived == window[yTypeName].prototype)
				return true;
			currentDerived = currentDerived.__proto__;
		}
		return false;
	}

	// (technically strings are not primitives in C#, but we consider them such)
	static GetIsTypePrimitive(typeName: string) {
		return [
			"byte", "sbyte", "short", "ushort",
			"int", "uint", "long", "ulong", "float", "double", "decimal",
			"bool", "char", "string"
		].Contains(typeName);
	}
	static GetIsTypeAnonymous(typeName: string): boolean {
		return typeName != null && typeName == "object";
	}
	static GetTypeNameOfObject(obj): string {
		var rawType = typeof obj;
		if (rawType == "object") { // if an object (i.e. a thing with real properties that could indicate a more specific type)
			if (obj.realTypeName)
				return obj.realTypeName;
			if (obj.itemType)
				return "List(" + obj.itemType + ")";
			var objectTypeName = obj.constructor.name_fake || obj.constructor.name || null;
			if (objectTypeName == "Number")
				return obj.toString().Contains(".") ? "double" : "int";
			return ConvertObjectTypeNameToVDFTypeName(objectTypeName);
		}
		if (rawType == "boolean")
			return "bool";
		if (rawType == "number")
			return obj.toString().Contains(".") ? "double" : "int";
		if (rawType == "string")
			return "string";
		//return rawType; // string
		//return null;
		//return "object"; // consider objects with raw-types of undefined, function, etc. to just be anonymous-objects
		return "object"; // consider everything else to be an anonymous-object
	}
	static GetTypeNameRoot(typeName) { return typeName != null && typeName.Contains("(") ? typeName.substr(0, typeName.indexOf("(")) : typeName; }

	static GetClassProps(type, allowGetFromCache = true): any {
		if (type == null) return {};
		if (!type.hasOwnProperty("classPropsCache") || type.allowPropsCache === false || !allowGetFromCache) {
			var result = {};
			// get static props on constructor itself
			for (let propName in VDF.GetObjectProps(type)) {
				if (propName in result) continue;
				result[propName] = type[propName];
			}
			// get "real" props on the prototype-object
			for (let propName in VDF.GetObjectProps(type.prototype)) {
				if (propName in result) continue;
				result[propName] = type.prototype[propName];
			}
			type.classPropsCache = result;
		}
        return type.classPropsCache;
	}
	static GetObjectProps(obj, includeInherited = true, includeGetterSetters = false): any {
		if (obj == null) return {};

		var result = {};
		var currentHost = Object(obj); // coerce to object first, in case it's a primitive and we're in es5
		while (currentHost && currentHost != Object && (currentHost == obj || includeInherited)) {
			for (let propName of Object.getOwnPropertyNames(currentHost)) {
				if (propName in result) continue;
				let propInfo = Object.getOwnPropertyDescriptor(currentHost, propName);
				let isGetterSetter = propInfo && (propInfo.get || propInfo.set);
				// don't include if prop is a getter or setter func (causes problems when enumerating)
				if (!isGetterSetter)
					result[propName] = currentHost[propName];
			}
			currentHost = Object.getPrototypeOf(currentHost);
		}
        return result;
	}

	static Serialize(obj: any, options: VDFSaveOptions): string;
	static Serialize(obj: any, declaredTypeName?: string, saveOptions?: VDFSaveOptions): string;
	static Serialize(obj: any, declaredTypeName_orOptions?: any, options_orNothing?: any): string {
		if (declaredTypeName_orOptions instanceof VDFSaveOptions)
			return VDF.Serialize(obj, null, declaredTypeName_orOptions);

		var declaredTypeName: string = declaredTypeName_orOptions;
		var options: VDFSaveOptions = options_orNothing;
		
		return VDFSaver.ToVDFNode(obj, declaredTypeName, options).ToVDF(options);
	}
	static Deserialize(vdf: string, options: VDFLoadOptions): any;
	static Deserialize(vdf: string, declaredTypeName?: string, options?: VDFLoadOptions): any;
	static Deserialize(vdf: string, declaredTypeName_orOptions?: any, options_orNothing?: any): any {
		if (declaredTypeName_orOptions instanceof VDFLoadOptions)
			return VDF.Deserialize(vdf, null, declaredTypeName_orOptions);

		var declaredTypeName: string = declaredTypeName_orOptions;
		var options: VDFLoadOptions = options_orNothing;
		return VDFLoader.ToVDFNode(vdf, declaredTypeName, options).ToObject(declaredTypeName, options);
	}
	static DeserializeInto(vdf: string, obj: any, options?: VDFLoadOptions): void { VDFLoader.ToVDFNode(vdf, VDF.GetTypeNameOfObject(obj), options).IntoObject(obj, options); }
}
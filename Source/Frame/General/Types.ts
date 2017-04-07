import {Global} from "./Globals_Free";
import {DoNothingXTimesThenDoY} from "./Timers";
import {Assert} from "./Assert";
import {T, _VDFDeserialize, _VDFSerialize} from "../Serialization/VDF/VDFTypeInfo";
import {VDFNode} from "../Serialization/VDF/VDFNode";

// standard types
// ----------

/*export class bool extends Boolean {}
export class int extends Number {}
export class double extends Number {}
export var string = "string" as any as (new(..._)=>string);*/

export var bool = ()=>"bool" as any as (new(..._)=>boolean);
export var int = ()=>"int" as any as (new(..._)=>number);
export var double = ()=>"double" as any as (new(..._)=>number);
export var string = ()=>"string" as any as (new(..._)=>string);

export function IsNaN(obj) { return typeof obj == "number" && obj != obj; }
export function IsPrimitive(obj) { return IsBool(obj) || IsNumber(obj) || IsString(obj); }
export function IsBool(obj) : obj is boolean { return typeof obj == "boolean"; } //|| obj instanceof Boolean
export function ToBool(boolStr) { return boolStr == "true" ? true : false; }

export function IsObject(obj) : obj is Object { return typeof obj == "object"; }
export function IsObjectOf<T>(obj) : obj is T { return typeof obj == "object"; }
export function IsNumber(obj, allowNumberObj = false) : obj is number {
	return typeof obj == "number" || (allowNumberObj && obj instanceof Number);
}
export function IsNumberString(obj) { return IsString(obj) && parseInt(obj).toString() == obj; }
export function IsInt(obj) : obj is number { return typeof obj == "number" && parseFloat(obj as any) == parseInt(obj as any); }
export function ToInt(stringOrFloatVal) { return parseInt(stringOrFloatVal); }
export function IsDouble(obj) : obj is number { return typeof obj == "number" && parseFloat(obj as any) != parseInt(obj as any); }
export function ToDouble(stringOrIntVal) { return parseFloat(stringOrIntVal); }

export function IsString(obj, allowStringObj = false) : obj is string {
	return typeof obj == "string" || (allowStringObj && obj instanceof String);
}
export function ToString(val) { return "" + val; }

export function IsConstructor(obj) : obj is new(..._)=>any {
	return obj instanceof Function && obj.name;
}

function TypeOrNameOrGetter_ToName<T>(typeOrNameOrGetter?: string | (new(..._)=>T) | ((_?)=>new(..._)=>T)): string {
	return typeOrNameOrGetter instanceof Function && typeOrNameOrGetter.name ? typeOrNameOrGetter.name :
		typeOrNameOrGetter instanceof Function ? (typeOrNameOrGetter as any)().name :
		typeOrNameOrGetter;
}

var types = {};
//export function TT(name: string, createIfNotExisting?): Type;
/** Gets the type info (Type object) for the given type (+ generic args, if any). */
export function TT(typeOrNameOrGetter: string | (new(..._)=>any) | ((_?)=>new(..._)=>any),
		subType1OrNameOrGetter?: string | (new(..._)=>any) | ((_?)=>new(..._)=>any),
		subType2OrNameOrGetter?: string | (new(..._)=>any) | ((_?)=>new(..._)=>any),
		createIfNotExisting = true): Type {
	if (typeOrNameOrGetter == null) // maybe temp
		return null;

	var name = TypeOrNameOrGetter_ToName(typeOrNameOrGetter);

	var result: Type;
	if (types[name] == null && createIfNotExisting)
		new Type(name);
	result = types[name];

	if (subType1OrNameOrGetter && subType2OrNameOrGetter == null)
		result = result.MakeSpecificType(subType1OrNameOrGetter);
	else if (subType1OrNameOrGetter && subType2OrNameOrGetter)
		result = result.MakeSpecificType(subType1OrNameOrGetter, subType2OrNameOrGetter);
		
	return result;
}

/** Gets the type-string for the given type (+ generic args, if any). */
export function TTS(typeOrName: string | (new(..._)=>any) | ((_?)=>new(..._)=>any),
		subType1OrName?: string | (new(..._)=>any) | ((_?)=>new(..._)=>any),
		subType2OrName?: string | (new(..._)=>any) | ((_?)=>new(..._)=>any)) {
	var type = TT(typeOrName, subType1OrName, subType2OrName);
	return type.name;
}

/** Alternative to @T, which accepts subtypes as well. */
export function TS(typeOrNameOrGetter: string | (new(..._)=>any) | ((_?)=>new(..._)=>any),
		subType1OrNameOrGetter?: string | (new(..._)=>any) | ((_?)=>new(..._)=>any),
		subType2OrNameOrGetter?: string | (new(..._)=>any) | ((_?)=>new(..._)=>any)) {
    return (target, name)=> {
		var typeName = TTS(typeOrNameOrGetter, subType1OrNameOrGetter, subType2OrNameOrGetter);
		var applyDecoratorFunc = T(typeName);
		applyDecoratorFunc(target, name);
    };
}

@Global
export class Type {
	@_VDFDeserialize(true) static Deserialize(node) {
		return node.primitiveValue ? TT(node.primitiveValue) : null;
	}

	constructor(name) {
		//Assert(VSType_Type.GetTypeByName(name) == null, `Cannot create a Type with same name as existing VSType_Type. (${name})`);

		this.name = name;
		this.nameRoot = name.Contains("(") ? name.substr(0, name.indexOf("(")) : name;

		//if (!(this instanceof VSType_Type))
		types[name] = this;
	}

	name: string;
	nameRoot: string;
    get CSName() { return this.name.replace(/\(/g, "<").replace(/\)/g, ">"); };
	
	//s.genericArguments = VDF.GetGenericArgumentsOfType(name).Select(a=>isVSType ? VSType_Type.GetTypeByName(a) : Type(a));
    GetGenericArguments() {
		var genericArgTypeNames = VDF.GetGenericArgumentsOfType(this.name);
        //return genericArgTypeNames.Select(a=>this instanceof VSType_Type ? VSType_Type.GetTypeByName(a) : TT(a));
		return genericArgTypeNames.Select(a=>TT(a));
    }
    GetGenericArgument(number) {
        //return s.genericArguments[number - 1] || Type("object");
        //return genericArguments[number - 1] || Type("object");
		return this.GetGenericArguments()[number - 1];
    }
    IsGeneric() { return this.name.match(/T[0-9]+/) != null; };
	GenericIndex() { return parseInt(this.name.match(/T([0-9]+)/)[1]); };
	get RootType() { return TT(this.name.split("(")[0]); };
	MakeSpecificType(...genericArgTypes: (string | (new(..._)=>any) | ((_?)=>new(..._)=>any))[]) {
        var rootType = this.RootType;
        var result = rootType.name + "(";
        for (let [index, genericArgType] of genericArgTypes.entries())
			result += (index > 0 ? " " : "") + TT(genericArgType).name;
        result += ")";
        return TT(result);
    }

	get Type() { return this; } // helper, to match with VSType

	toString() { return this.name; }
	@_VDFSerialize() Serialize() { return new VDFNode(this.toString()); }
	// old; fix for that C#-side crashes without metadata set to "Type"
	/*s.Serialize = function() {
		return new VDFNode(s.toString()).VSet({metadata_override: "Type"});
	}.AddTags(new VDFSerialize());*/

	// make-so: this is-derived-from and get-base-type stuff is (more) automatic (based on prototype/Object.getPrototype)
	IsDerivedFrom(otherTypeOrName: Type | string, allowSameType = true) {
		var other = IsType(otherTypeOrName) ? otherTypeOrName : TT(otherTypeOrName); // allow type-name arg
		if (this.name == other.name)
			return allowSameType;

		if (other.name.startsWith("List(") && this.name.startsWith("List(")) {
		    if (this.GetGenericArguments().All((genericArgType, index)=>genericArgType.IsDerivedFrom(other.GetGenericArguments()[index], false)))
				return true;
		}
		if (other.name == "IList" && this.name && this.name.startsWith("List("))
			return true;
		if (other.name.startsWith("Dictionary(") && this.name.startsWith("Dictionary(")) {
		    if (this.GetGenericArguments().All((genericArgType, index)=>genericArgType.IsDerivedFrom(other.GetGenericArguments()[index], false)))
				return true;
		}
		if (other.name == "IDictionary" && this.name && this.name.startsWith("Dictionary("))
			return true;

		if (other.name == "Element" && (this.name == "Variable" || this.name == "Subscript"))
			return true;

	    if (this.name != other.name && (other.name == "T1" || other.name == "T2"))
	        return true;
	    if (other.name == "object" && this.name != null)
			return true;
		
		if (window[this.name] && window[other.name] && window[this.name].prototype instanceof window[other.name])
			return true;
		return false;
	}
	GetBaseType() {
		// specifics - list (temp)
		if (this.IsDerivedFrom(TT("List(VObject)"), false))
			return TT("List(VObject)");
		if (this.IsDerivedFrom(TT("List(T1)"), false))
			return TT("List(T1)");
		// specifics - normal (temp)
		if (this.IsDerivedFrom(TT("VObject"), false))
			return TT("VObject");

		if (this.IsDerivedFrom(TT("IList"), false))
			return TT("IList");
		if (this.IsDerivedFrom(TT("IDictionary"), false))
			return TT("IDictionary");
		if (this.name == "object")
			return null;
		return TT("object");
	}
}

/*function IsType(obj, allowVSType = true) {
    if (obj instanceof Type)
        return true;
    if (allowVSType && obj instanceof VSType)
        return true;
    return false;
}*/
// probably make-so: this is removed
export function IsType(obj) : obj is Type {
    return obj instanceof Type;
}

/*g.IList = List;
g.IDictionary = Dictionary;*/
/*Type("IList");
Type("IDictionary");*/

// probably temp
/*function SimplifyTypeName(typeName) {
	var result = typeName;
	if (result.startsWith("List("))
		result = "IList";
	return result;
}*/
export function SimplifyType(type) {
	var typeName = IsType(type) ? type.name : type;
    if (typeName.startsWith("List("))
        return TT("IList");
    if (typeName.startsWith("Dictionary("))
        return TT("IDictionary");
    return type;
}
export function UnsimplifyType(type) {
    var typeName = IsType(type) ? type.name : type;
	if (typeName == "IList")
        return TT("List");
    if (typeName == "IDictionary")
        return TT("Dictionary");
    return type;
}

export function GetTypeNameOf(obj) {
	if (obj === null || obj === undefined) return null;
	return obj.GetTypeName();
}

// classes/enums
// ==========

/*var constructorHelper = function() {};
export function CreateClass(baseClass, classMembers) {
	baseClass = baseClass || Object;

	var result;

	if (classMembers && classMembers.hasOwnProperty("constructor"))
		result = classMembers.constructor;
	else
		result = function () { return baseClass.apply(this, arguments); };

	constructorHelper.prototype = baseClass.prototype;
	result.prototype = new constructorHelper();

	if (classMembers)
		result.prototype.Extend(classMembers);

	result.prototype.constructor = result;
	result.__super__ = baseClass.prototype;

	return result;
}*/
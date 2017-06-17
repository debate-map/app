import {Global} from "./Globals_Free";
import {DoNothingXTimesThenDoY} from "./Timers";
import {Assert} from "./Assert";

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

g.Extend({IsNaN}); declare global { function IsNaN(obj): boolean; }
export function IsNaN(obj) { return typeof obj == "number" && obj != obj; }
export function IsPrimitive(obj) { return IsBool(obj) || IsNumber(obj) || IsString(obj); }
export function IsBool(obj) : obj is boolean { return typeof obj == "boolean"; } //|| obj instanceof Boolean
export function ToBool(boolStr) { return boolStr == "true" ? true : false; }

export function IsObject(obj) : obj is Object { return typeof obj == "object"; }
export function IsObjectOf<T>(obj) : obj is T { return typeof obj == "object"; }
g.Extend({IsNumber}); declare global { function IsNumber(obj): obj is number; }
export function IsNumber(obj, allowNumberObj = false, allowNaN = false): obj is number {
	if (!allowNaN && IsNaN(obj)) return false;
	return typeof obj == "number" || (allowNumberObj && obj instanceof Number);
}
g.Extend({IsNumberString}); declare global { function IsNumberString(obj, allowNaN?): boolean; }
export function IsNumberString(obj, allowNaN = false) {
	if (!allowNaN && obj == "NaN") return false;
	return IsString(obj) && parseInt(obj).toString() == obj;
}
g.Extend({IsInt}); declare global { function IsInt(obj): obj is number; }
export function IsInt(obj) : obj is number { return typeof obj == "number" && parseFloat(obj as any) == parseInt(obj as any); }
g.Extend({ToInt}); declare global { function ToInt(stringOrFloatVal): number; }
export function ToInt(stringOrFloatVal) { return parseInt(stringOrFloatVal); }
export function IsDouble(obj) : obj is number { return typeof obj == "number" && parseFloat(obj as any) != parseInt(obj as any); }
export function ToDouble(stringOrIntVal) { return parseFloat(stringOrIntVal); }

g.Extend({IsString}); declare global { function IsString(obj, allowStringObj?: boolean): obj is string; }
export function IsString(obj, allowStringObj = false): obj is string {
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
import {VDFLoadOptions, VDFLoader} from "../Serialization/VDF/VDFLoader";
import {VDFSerialize, VDFDeserialize} from "../Serialization/VDF/VDFTypeInfo";
import {VDFSaveOptions, VDFTypeMarking, VDFSaver} from "../Serialization/VDF/VDFSaver";
import {VDFNode} from "../Serialization/VDF/VDFNode";
import * as Moment from "moment";

g.Extend({Moment});

export function DoNothing(...args) {}
export function DN(...args) {}

// type system
// ==========

/*function IsType(obj: any) {
	return obj instanceof Function;
}
// probably temp
/*function SimplifyTypeName(typeName) {
	var result = typeName;
	if (result.startsWith("List("))
		result = "IList";
	return result;
}*#/
export function SimplifyType(type) {
	var typeName = IsType(type) ? type.name : type;
    if (typeName.startsWith("List("))
        return Type("IList");
    if (typeName.startsWith("Dictionary("))
        return Type("IDictionary");
    return type;
}
export function UnsimplifyType(type) {
    var typeName = IsType(type) ? type.name : type;
	if (typeName == "IList")
        return Type("List");
    if (typeName == "IDictionary")
        return Type("Dictionary");
    return type;
}*/

// polyfills for constants
// ==========

if (Number.MIN_SAFE_INTEGER == null)
	(Number as any).MIN_SAFE_INTEGER = -9007199254740991;
if (Number.MAX_SAFE_INTEGER == null)
	(Number as any).MAX_SAFE_INTEGER = 9007199254740991;

//g.Break = function() { debugger; };
G({Debugger_If}); declare global { function Debugger(); }
export function Debugger() { debugger; }
G({Debugger_If}); declare global { function Debugger_True(); }
export function Debugger_True() { debugger; return true; }
G({Debugger_If}); declare global { function Debugger_If(condition); }
export function Debugger_If(condition) {
    if (condition)
        debugger;
}

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
g.Extend({E});

// methods: serialization
// ==========

// object-Json
declare global { function FromJSON(json: string); } g.Extend({FromJSON});
export function FromJSON(json: string) { return JSON.parse(json); }

/*declare global { function ToJSON(obj, ...excludePropNames): string; } g.Extend({ToJSON});
export function ToJSON(obj, ...excludePropNames): string {
	try {
		if (arguments.length > 1) {
			return JSON.stringify(obj, function(key, value) {
				if (excludePropNames.Contains(key))
					return;
				return value;
			});
		}
		return JSON.stringify(obj);
	}
	catch (ex) {
		if (ex.toString() == "TypeError: Converting circular structure to JSON")
			return ToJSON_Safe.apply(this, arguments);
		throw ex;
	}
}*/
g.Extend({ToJSON}); declare global { function ToJSON(obj, replacerFunc?, spacing?: number): string; }
export function ToJSON(obj, replacerFunc?, spacing?: number): string {
	try {
		return JSON.stringify(obj, replacerFunc, spacing);
	} catch (ex) {
		if (ex.toString() == "TypeError: Converting circular structure to JSON")
			return ToJSON_Safe.apply(this, arguments);
		throw ex;
	}
}

declare global { function ToJSON_Safe(obj, ...excludePropNames): string; } g.Extend({ToJSON_Safe});
export function ToJSON_Safe(obj, ...excludePropNames) {
	var cache = [];
	var foundDuplicates = false;
	var result = JSON.stringify(obj, function(key, value) {
		if (excludePropNames.Contains(key))
			return;
		if (typeof value == 'object' && value !== null) {
			// if circular reference found, discard key
			if (cache.indexOf(value) !== -1) {
				foundDuplicates = true;
				return;
			}
			cache.push(value); // store value in our cache
		}
		return value;
	});
	//cache = null; // enable garbage collection
	if (foundDuplicates)
		result = "[was circular]" + result;
	return result;
}

declare global { function ToJSON_Try(obj, ...excludePropNames): string; } g.Extend({ToJSON_Try});
export function ToJSON_Try(...args) {
	try {
		return ToJSON.apply(this, args);
	} catch (ex) {}
	return "[converting to JSON failed]";
}

declare global { function Clone(obj): any; } g.Extend({Clone});
function Clone(obj) {
	return FromJSON(ToJSON(obj));
}

// object-VDF
// ----------

//Function.prototype._AddGetter_Inline = function VDFSerialize() { return function() { return VDF.CancelSerialize; }; };
(Function.prototype as any).Serialize = (function() { return VDF.CancelSerialize; } as any).AddTags(new VDFSerialize());

export function FinalizeFromVDFOptions(options = null) {
    options = options || new VDFLoadOptions();
	options.loadUnknownTypesAsBasicTypes = true;
	return options;
}
export function FromVDF(vdf: string, options?: VDFLoadOptions);
export function FromVDF(vdf: string, declaredTypeName: string, options?: VDFLoadOptions);
export function FromVDF(vdf, declaredTypeName_orOptions?, options?) {
	if (declaredTypeName_orOptions instanceof VDFLoadOptions)
		return FromVDF(vdf, null, declaredTypeName_orOptions);

	try { return VDF.Deserialize(vdf, declaredTypeName_orOptions, FinalizeFromVDFOptions(options)); }
	/*catch(error) { if (!InUnity()) throw error;
		LogError("Error) " + error + "Stack)" + error.Stack + "\nNewStack) " + new Error().Stack + "\nVDF) " + vdf);
	}/**/ finally {}
}
export function FromVDFInto(vdf, obj, options?) {
	try { return VDF.DeserializeInto(vdf, obj, FinalizeFromVDFOptions(options)); }
	/*catch(error) { if (!InUnity()) throw error;
		LogError("Error) " + error + "Stack)" + error.Stack + "\nNewStack) " + new Error().Stack + "\nVDF) " + vdf); }
	/**/ finally {}
}
export function FromVDFToNode(vdf: string, options?: VDFLoadOptions);
export function FromVDFToNode(vdf: string, declaredTypeName: string, options?: VDFLoadOptions);
export function FromVDFToNode(vdf, declaredTypeName_orOptions?, options?) {
	if (declaredTypeName_orOptions instanceof VDFLoadOptions)
		return FromVDF(vdf, null, declaredTypeName_orOptions);

	try { return VDFLoader.ToVDFNode(vdf, declaredTypeName_orOptions, FinalizeFromVDFOptions(options)); }
	/*catch(error) { if (!InUnity()) throw error;
		LogError("Error) " + error + "Stack)" + error.Stack + "\nNewStack) " + new Error().Stack + "\nVDF) " + vdf);
	}/**/ finally {}
}
export function FromVDFNode(node, declaredTypeName?) { // alternative to .ToObject(), which applies default (program) settings
	return node.ToObject(declaredTypeName, FinalizeFromVDFOptions());
}

export function FinalizeToVDFOptions(options?) {
    options = options || new VDFSaveOptions();
	return options;
}
/*function ToVDF(obj, /*o:*#/ declaredTypeName_orOptions, options_orNothing) {
	try { return VDF.Serialize(obj, declaredTypeName_orOptions, options_orNothing); }
	/*catch(error) { if (!InUnity()) throw error; else LogError("Error) " + error + "Stack)" + error.stack + "\nNewStack) " + new Error().stack + "\nObj) " + obj); }
	//catch(error) { if (!InUnity()) { debugger; throw error; } else LogError("Error) " + error + "Stack)" + error.stack + "\nNewStack) " + new Error().stack + "\nObj) " + obj); }
}*/
export function ToVDF(obj, markRootType = true, typeMarking = VDFTypeMarking.Internal, options = null) {
	try {
		options = FinalizeToVDFOptions(options);
		options.typeMarking = typeMarking;
		return VDF.Serialize(obj, !markRootType && obj != null ? obj.GetTypeName() : null, options);
	}
	/*catch(error) {
		if (!InUnity()) throw error;
		LogError("Error) " + error + "Stack)" + error.Stack + "\nNewStack) " + new Error().Stack + "\nObj) " + obj);
	}/**/ finally {}
}
export function ToVDFNode(vdf: string, options?: VDFSaveOptions);
export function ToVDFNode(vdf: string, declaredTypeName: string, options?: VDFSaveOptions);
export function ToVDFNode(obj, declaredTypeName_orOptions?, options_orNothing?) {
	try {
	    return VDFSaver.ToVDFNode(obj, declaredTypeName_orOptions, options_orNothing);
	}
	/*catch (error) { if (!InUnity()) throw error;
		LogError("Error) " + error + "Stack)" + error.Stack + "\nNewStack) " + new Error().Stack + "\nObj) " + obj);
	}/**/ finally {}
}

export function GetTypeNameOf(obj) {
	if (obj === null || obj === undefined || obj.constructor == null) return null;
	return obj.GetTypeName();
}

// vdf extensions
// ==========

(Moment as any).prototype.Serialize = (function() {
	return new VDFNode(this.format("YYYY-MM-DD HH:mm:ss.SSS"));
} as any).AddTags(new VDFSerialize());
(Moment as any).prototype.Deserialize = (function(node) {
	return (Moment as any)(node.primitiveValue);
} as any).AddTags(new VDFDeserialize(true));

// fix for that ObservableArray's would be serialized as objects
/*var observableHelper = O({test1: []});
var ObservableArray = observableHelper.test1.constructor;
(ObservableArray as any).name_fake = "List(object)";
//alert(ObservableArray + ";" + VDF.GetTypeNameOfObject(observableHelper.test1))*/

// others
// ==========

g.Extend({Delay}); declare global { function Delay(delay: number): Promise<any>; }
function Delay(delay: number): Promise<any> {  
	return new Promise(function(resolve, reject) {
		setTimeout(()=>resolve(), delay);
	});
}

export function Range(min, max, step = 1, includeMax = true) {
	var result: number[] = [];
	for (let i = min; includeMax ? i <= max : i < max; i += step)
		result.push(i);
	return result;
}

export function Global(target: Function) {
	var name = (target as any).GetName();
	//console.log("Globalizing: " + name);
	g[name] = target;
}

export class IDProvider {
	lastID = -1;
	GetID() {
		return ++this.lastID;
	}
}
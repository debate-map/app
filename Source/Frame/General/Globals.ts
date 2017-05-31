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

const nl = "\n";
g.Extend({nl}); declare global { const nl: string; }
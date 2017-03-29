import {IsNumber} from "./Types";

// maybe temp (maybe instead find way to have TypeScript enums work well)
export class Enum {
	static Deserialize; // attached using @Enum decorator
	static _IsEnum = 0; // mimic odd enum marker/flag, used by TypeScript

	static entries: Enum[];
	static names: string[];
	static values: number[];
	static options: {name, value}[];

	constructor(name: string, value: number) {
		//s.realTypeName = enumTypeName; // old: maybe temp; makes-so VDF system recognizes enumValues as of this enumType
		this.name = name;
		this.value = value;
	}

	name: string;
	//get N() { return this.name; } // helper for use in indexer
	/** ie index */ value: number;

	//@_VDFSerialize() Serialize() { return new VDFNode(this.name, this.constructor.GetName()); }
	toString() { return this.name; };
	//valueOf() { return s.value; }; // currently removed, since overrides toString for to-primitive use, thus disabling the "player.age == 'Rodent'" functionality
}
export function _Enum(target: any) {
	var typeName = target.GetName();
	// for now at least, auto-add enum as global, since enums are types and VDF system needs types to be global
	g[typeName] = target;

	// extends class itself
	target.Deserialize = function(node) { return target[node.primitiveValue]; }; //.AddTags(new VDFDeserialize(true));
	target.V = new target("enum root");
	//target.name = enumTypeName;
	//target.realTypeName = enumTypeName;
	//target._IsEnum = 0; // mimic odd enum marker/flag, used by TypeScript

	// add enum entries
	//var names = Object.getOwnPropertyNames(target.prototype);
	var tempEnumInstance = new target();
	var names = Object.getOwnPropertyNames(tempEnumInstance).Except("name", "value");
	var index = -1;
	for (let name of names) {
		++index;
		let value = IsNumber(tempEnumInstance[name]) ? tempEnumInstance[name] : index;
		let entry = new target(name, value);
		// make accessible by MyEnum.MyEntry
		target[name] = entry;
		// make accessible by MyEnum.V.MyEntry
		target.V[name] = entry;
	}

	target.names = names;
	target.entries = target.names.Select(name=>target[name]);
	target.values = target.entries.Select(a=>a.value);
	target.options = target.entries.Select(a=>({name: a.name, value: a}));
}

// functions for if using TypeScript enums
// ==========

export function GetEntries(enumType, nameModifierFunc?: (name: string)=>string) {
	return Object.keys(enumType).Where(a=>a.match(/^\D/) != null).Select(name=>({name: nameModifierFunc ? nameModifierFunc(name) : name, value: enumType[name] as number}));
}
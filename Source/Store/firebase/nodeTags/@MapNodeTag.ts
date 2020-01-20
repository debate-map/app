import {AddSchema, UUID_regex, GetSchemaJSON} from "vwebapp-framework";
import {GetValues_ForSchema, ModifyString} from "js-vextensions";
import {Polarity} from "../nodes/@MapNode";

export class MapNodeTag {
	constructor(initialData: Partial<MapNodeTag>) {
		this.VSet(initialData);
	}

	_key?: string;
	creator: string;
	createdAt: number;

	//type: MapNodeTagType;
	//nodes: {[key: string]: string};
	nodes: string[];

	// type-specific fields (ie. tag comps)
	mirrorChildrenFromXToY: TagComp_MirrorChildrenFromXToY;
}
AddSchema("MapNodeTag", {
	properties: {
		creator: {type: "string"},
		createdAt: {type: "number"},

		//type: {$ref: "MapNodeTagType"},
		//nodes: {patternProperties: {[UUID_regex]: {type: "string"}}},
		nodes: {items: {$ref: "UUID"}},

		mirrorChildrenFromXToY: {$ref: "TagComp_MirrorChildrenFromXToY"},
	},
	required: ["creator", "createdAt", "nodes"],
});

// tag comps
// ==========

export abstract class TagComp {
	static key: string;
	static displayName: string;
	static description: string;
	static nodeKeys: string[]; // fields whose values should be added to MapNodeTag.nodes array
}

/*export class TagComp_ExampleBasedClaim extends TagComp {
	//static key = "exampleBasedClaim";
	static displayName = "example-based claim";
	static description = "Makes-so only arguments of a given polarity can be added; used for claims which default to true/false, in the absense of arguments to the contrary.";
	static nodeKeys = ["nodeX"];

	constructor(initialData?: Partial<TagComp_ExampleBasedClaim>) { super(); this.VSet(initialData); }

	nodeX: string;
	polarityAllowed: Polarity;
}
AddSchema("TagComp_ExampleBasedClaim", {
	properties: {
		nodeX: {$ref: "UUID"},
		polarityAllowed: {$ref: "Polarity"},
	},
});*/

export class TagComp_MirrorChildrenFromXToY extends TagComp {
	//static key = "mirrorChildrenFromXToY";
	static displayName = "mirror children from X to Y";
	static description = "Makes-so any children of node-x (matching the parameters) are shown as children of node-y. (only usable for claims currently)";
	static nodeKeys = ["nodeX", "nodeY"];

	constructor(initialData?: Partial<TagComp_MirrorChildrenFromXToY>) { super(); this.VSet(initialData); }

	nodeX: string;
	nodeY: string;
	mirrorSupporting = true;
	mirrorOpposing = true;
	reversePolarities = false;
	disableDirectChildren = false;
	//overrideDirectChildren = false;
	//recursive = false;
}
AddSchema("TagComp_MirrorChildrenFromXToY", {
	properties: {
		nodeX: {$ref: "UUID"},
		nodeY: {$ref: "UUID"},
		mirrorSupporting: {type: "boolean"},
		mirrorOpposing: {type: "boolean"},
		reversePolarities: {type: "boolean"},
		disableDirectChildren: {type: "boolean"},
	},
});

// tag comp meta
// ==========

export const TagComp_classes = [
	TagComp_MirrorChildrenFromXToY,
] as const;
export type TagComp_Class = typeof TagComp_classes[number];
CalculateTagCompClassStatics();
export const TagComp_keys = TagComp_classes.map(c=>c.key);
export const TagComp_names = TagComp_classes.map(c=>c.displayName);

// use class-names to calculate keys and display-names
function CalculateTagCompClassStatics() {
	for (const compClass of TagComp_classes) {
		compClass.key = compClass.key ?? CalculateTagCompKey(compClass.name);
		compClass.displayName = compClass.displayName ?? CalculateTagCompDisplayName(compClass.name);
	}
}

export function CalculateTagCompKey(className: string) {
	//return GetSchemaJSON("MapNodeTag").properties.Pairs().find(a=>a.value.$ref == className).key;
	let displayName = className.replace(/TagComp_/, "");
	displayName = ModifyString(displayName, m=>[m.startUpper_to_lower]);
	return displayName;
}
export function GetTagCompClassByKey(key: string) {
	return TagComp_classes.find(a=>a.key == key);
}
export function CalculateTagCompDisplayName(className: string) {
	const autoSlotNames = ["x", "y", "z"];
	let displayName = className.replace(/TagComp_/, "");
	displayName = ModifyString(displayName, m=>[m.startUpper_to_lower, m.lowerUpper_to_lowerSpaceLower]);
	for (const slotName of autoSlotNames) {
		displayName = displayName.replace(new RegExp(`(^| )${slotName}( |$)`), slotName.toUpperCase());
	}
	return displayName;
}
export function GetTagCompClassByDisplayName(displayName: string) {
	return TagComp_classes.find(a=>a.displayName == displayName);
}
export function GetTagCompClassByTag(tag: MapNodeTag) {
	return TagComp_classes.find(a=>a.key in tag);
}

/*export type MapNodeTagType = typeof TagComp_classes[number];
export const MapNodeTagType_values = ["mirror children from X to Y"] as const; //, "example-based claim", "X extends Y"];
//AddSchema("MapNodeTagType", {oneOf: MapNodeTagType_values.map(val=>({const: val}))});
export const MapNodeTagType_keys = MapNodeTagType_values.map(type=>ConvertNodeTagTypeToKey(type));
export function ConvertNodeTagTypeToKey(type: MapNodeTagType) {
	return ModifyString(type, m=>[m.spaceLower_to_spaceUpper, m.removeSpaces, m.hyphenLower_to_hyphenUpper, m.removeHyphens]);
}
export function GetNodeTagKey(tag: MapNodeTag) {
	return MapNodeTagType_keys.find(key=>key in tag);
}
export function GetNodeTagType(tag: MapNodeTag) {
	const compKeyIndex = MapNodeTagType_keys.findIndex(key=>key in tag);
	return MapNodeTagType_values[compKeyIndex];
}*/
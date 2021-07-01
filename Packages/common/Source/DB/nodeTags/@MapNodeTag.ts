import {AddSchema, UUID_regex, GetSchemaJSON, Validate, MGLClass, Field, DB} from "web-vcore/nm/mobx-graphlink.js";
import {GetValues_ForSchema, ModifyString, CE} from "web-vcore/nm/js-vextensions.js";
import {Polarity} from "../nodes/@MapNode.js";

@MGLClass({table: "nodeTags"})
export class MapNodeTag {
	constructor(initialData: Partial<MapNodeTag>) {
		CE(this).VSet(initialData);
	}

	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {req: true})
	creator: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"}, {req: true})
	createdAt: number;

	//@Field({$ref: "MapNodeTagType"})
	//type: MapNodeTagType;
	//@Field({patternProperties: {[UUID_regex]: {type: "string"}}})
	//nodes: {[key: string]: string};

	@DB((t,n)=>t.specificType(n, "text[]"))
	@Field({items: {$ref: "UUID"}}, {req: true})
	nodes: string[];

	// type-specific fields (ie. tag comps)
	// ==========

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: "TagComp_MirrorChildrenFromXToY"})
	mirrorChildrenFromXToY: TagComp_MirrorChildrenFromXToY;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: "TagComp_XIsExtendedByY"})
	xIsExtendedByY: TagComp_XIsExtendedByY;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: "TagComp_MutuallyExclusiveGroup"})
	mutuallyExclusiveGroup: TagComp_MutuallyExclusiveGroup;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: "TagComp_RestrictMirroringOfX"})
	restrictMirroringOfX: TagComp_RestrictMirroringOfX;
}

// tag comps
// ==========

export abstract class TagComp {
	static key: string;
	static displayName: string;
	static description: string;
	static nodeKeys: string[]; // fields whose values should be added to MapNodeTag.nodes array (field-value can be a node-id string, or an array of such strings)

	/** Has side-effect: Casts data to its original class/type. */
	GetFinalTagComps(): TagComp[] {
		let compClass = GetTagCompClassByKey(this["_key"]);
		if (compClass) return [CE(this).As(compClass as any)];
		return [this];
	}
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

	constructor(initialData?: Partial<TagComp_MirrorChildrenFromXToY>) { super(); CE(this).VSet(initialData); }

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

export class TagComp_XIsExtendedByY extends TagComp {
	static displayName = "X is extended by Y (composite)";
	static description = CE(`
		Meaning: claim Y is the same as claim X, except it is wider-scoped (and thus weaker) than X -- along some consistent axis/criteria of a series.
		Example: X (we should charge at least $50) is extended by Y (we should charge at least $100).
		Effect: Makes-so any con-args of X (base) are mirrored as con-args of Y (extension), and any pro-args of Y (extension) are mirrored as pro-args of X (base).
	`).AsMultiline(0);
	static nodeKeys = ["nodeX", "nodeY"];

	constructor(initialData?: Partial<TagComp_XIsExtendedByY>) { super(); CE(this).VSet(initialData); }

	nodeX: string;
	nodeY: string;

	GetFinalTagComps() {
		let result = super.GetFinalTagComps();

		let mirrorComp_xConsToY = new TagComp_MirrorChildrenFromXToY({
			nodeX: this.nodeX,
			nodeY: this.nodeY,
			mirrorSupporting: false,
			mirrorOpposing: true,
		});
		result.push(mirrorComp_xConsToY);

		let mirrorComp_yProsToX = new TagComp_MirrorChildrenFromXToY({
			nodeX: this.nodeY,
			nodeY: this.nodeX,
			mirrorSupporting: true,
			mirrorOpposing: false,
		});
		result.push(mirrorComp_yProsToX);

		return result;
	}
}
AddSchema("TagComp_XIsExtendedByY", {
	properties: {
		nodeX: {$ref: "UUID"},
		nodeY: {$ref: "UUID"},
	},
});

export class TagComp_MutuallyExclusiveGroup extends TagComp {
	static displayName = "mutually exclusive group (composite)";
	static description = CE(`
		Marks a set of nodes as being mutually exclusive with each other.
		(common use: having each one's pro-args be mirrored as con-args of the others)
	`).AsMultiline(0);
	static nodeKeys = ["nodes"];

	constructor(initialData?: Partial<TagComp_MutuallyExclusiveGroup>) { super(); CE(this).VSet(initialData); }

	nodes = [] as string[];
	mirrorXProsAsYCons = true;

	GetFinalTagComps() {
		let result = super.GetFinalTagComps();
		if (this.mirrorXProsAsYCons) {
			for (let nodeX of this.nodes) {
				for (let nodeY of CE(this.nodes).Except(nodeX)) {
					let mirrorComp = new TagComp_MirrorChildrenFromXToY({
						nodeX, nodeY,
						mirrorSupporting: true,
						mirrorOpposing: false,
						reversePolarities: true,
					});
					result.push(mirrorComp);
				}
			}
		}
		return result;
	}
}
AddSchema("TagComp_MutuallyExclusiveGroup", {
	properties: {
		nodes: {items: {$ref: "UUID"}},
		mirrorXProsAsYCons: {type: "boolean"},
	},
});

export class TagComp_RestrictMirroringOfX extends TagComp {
	static displayName = "restrict mirroring of X";
	static description = "Restricts mirroring of node X, by blacklisting certain mirror-parents, or mirror-parents in general.";
	static nodeKeys = ["nodeX", "blacklistedMirrorParents"];

	constructor(initialData?: Partial<TagComp_RestrictMirroringOfX>) { super(); CE(this).VSet(initialData); }

	nodeX: string;
	blacklistAllMirrorParents = true;
	blacklistedMirrorParents = [] as string[];
}
AddSchema("TagComp_RestrictMirroringOfX", {
	properties: {
		nodeX: {$ref: "UUID"},
		blacklistAllMirrorParents: {type: "boolean"},
		blacklistedMirrorParents: {items: {$ref: "UUID"}},
	},
});

// tag comp meta
// ==========

export const TagComp_classes = [
	TagComp_MirrorChildrenFromXToY,
	TagComp_XIsExtendedByY,
	TagComp_MutuallyExclusiveGroup,
	TagComp_RestrictMirroringOfX,
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
	return TagComp_classes.find(a=>a.key in tag)!;
}
export function GetTagCompOfTag(tag: MapNodeTag): TagComp {
	let compClass = GetTagCompClassByTag(tag);
	return tag[compClass.key];
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

export function CalculateNodeIDsForTagComp(tagComp: TagComp, compClass: TagComp_Class) {
	/*let compClass = GetTagCompClassByTag(tag);
	let comp = GetTagCompOfTag(tag);*/
	//let compClass = GetTagCompClassByKey(tagComp["_key"]);
	return CE(compClass.nodeKeys).SelectMany(key=> {
		let nodeKeyValue = tagComp[key];
		let nodeIDsForKey = Array.isArray(nodeKeyValue) ? nodeKeyValue : [nodeKeyValue];
		return nodeIDsForKey.filter(nodeID=>Validate("UUID", nodeID) == null);
	});
}
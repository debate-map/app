import {AddSchema, UUID_regex, GetSchemaJSON, Validate, MGLClass, Field, DB} from "mobx-graphlink";
import {GetValues_ForSchema, ModifyString, CE, Assert, Clone} from "js-vextensions";
import {NodeTagCloneType} from "../../Commands.js";
import {MarkerForNonScalarField} from "../../Utils/General/General.js";

@MGLClass({table: "nodeTags"})
export class NodeTag {
	constructor(initialData: Partial<NodeTag>) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	//@Field({$ref: "NodeTagType"})
	//type: NodeTagType;
	//@Field({patternProperties: {[UUID_regex]: {type: "string"}}})
	//nodes: {[key: string]: string};

	@DB((t, n)=>t.specificType(n, "text[]"))
	@Field({items: {$ref: "UUID"}})
	nodes: string[];

	// type-specific fields (ie. tag comps)
	// ==========

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: "TagComp_Labels", ...MarkerForNonScalarField()}, {opt: true})
	labels?: TagComp_Labels;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: "TagComp_MirrorChildrenFromXToY", ...MarkerForNonScalarField()}, {opt: true})
	mirrorChildrenFromXToY?: TagComp_MirrorChildrenFromXToY;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: "TagComp_XIsExtendedByY", ...MarkerForNonScalarField()}, {opt: true})
	xIsExtendedByY?: TagComp_XIsExtendedByY;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: "TagComp_MutuallyExclusiveGroup", ...MarkerForNonScalarField()}, {opt: true})
	mutuallyExclusiveGroup?: TagComp_MutuallyExclusiveGroup;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: "TagComp_RestrictMirroringOfX", ...MarkerForNonScalarField()}, {opt: true})
	restrictMirroringOfX?: TagComp_RestrictMirroringOfX;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: "TagComp_CloneHistory", ...MarkerForNonScalarField()}, {opt: true})
	cloneHistory?: TagComp_CloneHistory;

	@DB((t, n)=>t.specificType(n, "text[]"))
	@Field({items: {type: "string"}})
	c_accessPolicyTargets: string[]; // format is: `${policyId}:${apTable}`
}
export function MaybeCloneAndRetargetNodeTag(tag: NodeTag, cloneType: NodeTagCloneType, oldNodeID: string, newNodeID: string): NodeTag|n {
	const tagCloneLevel = [NodeTagCloneType.minimal, NodeTagCloneType.basics].indexOf(cloneType);

	const newTag = Clone(tag) as NodeTag;
	if (newTag.labels != null && tagCloneLevel >= 1) {
		newTag.labels.nodeX = newNodeID;
	}
	// clone-history tags are a special case: clone+extend them if-and-only-if the result/final-entry is the old-node (preserving history without creating confusion)
	else if (newTag.cloneHistory != null && newTag.cloneHistory.cloneChain.LastOrX() == oldNodeID) {
		newTag.cloneHistory.cloneChain.push(newNodeID);
		//newTag.nodes.push(newNodeID);
	} else {
		return null;
	}

	newTag.nodes = CalculateNodeIDsForTag(newTag);
	return newTag;
}

// tag comps
// ==========

export abstract class TagComp {
	static key: string;
	static displayName: string;
	static description: string;
	static nodeKeys: string[]; // fields whose values should be added to NodeTag.nodes array (field-value can be a node-id string, or an array of such strings)
	/*#* Method that retargets the tag-comp from one node to another. (called when a node and its tags are being cloned) */
	//ChangeTarget(oldNodeID: string, newNodeID: string) {}

	/** Has side-effect: Casts tag-comps to their original classes/types. */
	//abstract GetFinalTagComps(): TagComp[];
	GetFinalTagComps(): TagComp[] {
		//const compClass = GetTagCompClassByKey(this["_key"]);
		const compClass = this.constructor;
		if (compClass) return [CE(this).Cast(compClass as any)];
		return [this];
	}
}

@MGLClass()
export class TagComp_Labels extends TagComp {
	//static key = "labels";
	static displayName = "labels";
	static description = "Generic container for attaching arbitrary text labels to a node. (eg. as annotations for third-party tools)";
	static nodeKeys = ["nodeX"];
	//ChangeTarget(oldNodeID: string, newNodeID: string) { this.nodeX = newNodeID; }

	constructor(initialData?: Partial<TagComp_Labels>) { super(); CE(this).VSet(initialData); }

	@Field({$ref: "UUID"})
	nodeX: string;

	@Field({items: {type: "string"}})
	labels = [] as string[];
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
		Meaning: claim Y is consistent with claim X, but taken to a further extent/degree (along some consistent axis/criteria of a series).
		Example: X (we should charge at least $50) is extended by Y (we should charge at least $100).
		Effect: Makes-so any con-args of X (base) are mirrored as con-args of Y (extension), and any pro-args of Y (extension) are mirrored as pro-args of X (base).
	`).AsMultiline(0);
	static nodeKeys = ["nodeX", "nodeY"];

	constructor(initialData?: Partial<TagComp_XIsExtendedByY>) { super(); CE(this).VSet(initialData); }

	nodeX: string;
	nodeY: string;

	GetFinalTagComps() {
		const result = super.GetFinalTagComps();

		const mirrorComp_xConsToY = new TagComp_MirrorChildrenFromXToY({
			nodeX: this.nodeX,
			nodeY: this.nodeY,
			mirrorSupporting: false,
			mirrorOpposing: true,
		});
		result.push(mirrorComp_xConsToY);

		const mirrorComp_yProsToX = new TagComp_MirrorChildrenFromXToY({
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
		const result = super.GetFinalTagComps();
		if (this.mirrorXProsAsYCons) {
			for (const nodeX of this.nodes) {
				for (const nodeY of CE(this.nodes).Exclude(nodeX)) {
					const mirrorComp = new TagComp_MirrorChildrenFromXToY({
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

export class TagComp_CloneHistory extends TagComp {
	static displayName = "clone history";
	static description = "Keeps a history of the nodes that were cloned to result in the final node in the chain.";
	static nodeKeys = ["cloneChain"];

	constructor(initialData?: Partial<TagComp_CloneHistory>) { super(); CE(this).VSet(initialData); }

	cloneChain = [] as string[];
}
AddSchema("TagComp_CloneHistory", {
	properties: {
		cloneChain: {items: {$ref: "UUID"}},
	},
});

// tag comp meta
// ==========

export const TagComp_classes = [
	TagComp_Labels,
	TagComp_MirrorChildrenFromXToY,
	TagComp_XIsExtendedByY,
	TagComp_MutuallyExclusiveGroup,
	TagComp_RestrictMirroringOfX,
	TagComp_CloneHistory,
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
	//return GetSchemaJSON("NodeTag").properties.Pairs().find(a=>a.value.$ref == className).key;
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
export function GetTagCompClassByTag(tag: NodeTag) {
	return TagComp_classes.find(a=>tag[a.key] != null)!;
	/*Assert(tag.constructor.name.startsWith("TagComp_"), "Tag-comp must have prototype re-applied before this point.");
	return tag.constructor as TagComp_Class;*/
}
export function GetTagCompOfTag(tag: NodeTag): TagComp {
	const compClass = GetTagCompClassByTag(tag);
	return tag[compClass.key];
}

/*export type NodeTagType = typeof TagComp_classes[number];
export const NodeTagType_values = ["mirror children from X to Y"] as const; //, "example-based claim", "X extends Y"];
//AddSchema("NodeTagType", {oneOf: NodeTagType_values.map(val=>({const: val}))});
export const NodeTagType_keys = NodeTagType_values.map(type=>ConvertNodeTagTypeToKey(type));
export function ConvertNodeTagTypeToKey(type: NodeTagType) {
	return ModifyString(type, m=>[m.spaceLower_to_spaceUpper, m.removeSpaces, m.hyphenLower_to_hyphenUpper, m.removeHyphens]);
}
export function GetNodeTagKey(tag: NodeTag) {
	return NodeTagType_keys.find(key=>key in tag);
}
export function GetNodeTagType(tag: NodeTag) {
	const compKeyIndex = NodeTagType_keys.findIndex(key=>key in tag);
	return NodeTagType_values[compKeyIndex];
}*/

export function CalculateNodeIDsForTag(tag: NodeTag) {
	const compClass = GetTagCompClassByTag(tag);
	const tagComp = GetTagCompOfTag(tag);
	return CalculateNodeIDsForTagComp(tagComp, compClass);
}
export function CalculateNodeIDsForTagComp(tagComp: TagComp, compClass: TagComp_Class) {
	/*let compClass = GetTagCompClassByTag(tag);
	let comp = GetTagCompOfTag(tag);*/
	//let compClass = GetTagCompClassByKey(tagComp["_key"]);
	return CE(compClass.nodeKeys).SelectMany(key=>{
		const nodeKeyValue = tagComp[key];
		const nodeIDsForKey = Array.isArray(nodeKeyValue) ? nodeKeyValue : [nodeKeyValue];
		return nodeIDsForKey.filter(nodeID=>Validate("UUID", nodeID) == null);
	});
}
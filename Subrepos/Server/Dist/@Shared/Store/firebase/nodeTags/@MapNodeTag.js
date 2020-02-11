import { AddSchema, Validate } from "mobx-firelink";
import { ModifyString, CE } from "js-vextensions";
export class MapNodeTag {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
AddSchema("MapNodeTag", {
    properties: {
        creator: { type: "string" },
        createdAt: { type: "number" },
        //type: {$ref: "MapNodeTagType"},
        //nodes: {patternProperties: {[UUID_regex]: {type: "string"}}},
        nodes: { items: { $ref: "UUID" } },
        mirrorChildrenFromXToY: { $ref: "TagComp_MirrorChildrenFromXToY" },
        xIsExtendedByY: { $ref: "TagComp_XIsExtendedByY" },
        mutuallyExclusiveGroup: { $ref: "TagComp_MutuallyExclusiveGroup" },
        restrictMirroringOfX: { $ref: "TagComp_RestrictMirroringOfX" },
    },
    required: ["creator", "createdAt", "nodes"],
});
// tag comps
// ==========
export class TagComp {
    /** Has side-effect: Casts data to its original class/type. */
    GetFinalTagComps() {
        let compClass = GetTagCompClassByKey(this["_key"]);
        if (compClass)
            return [CE(this).As(compClass)];
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
    constructor(initialData) {
        super();
        this.mirrorSupporting = true;
        this.mirrorOpposing = true;
        this.reversePolarities = false;
        this.disableDirectChildren = false;
        CE(this).VSet(initialData);
    }
}
//static key = "mirrorChildrenFromXToY";
TagComp_MirrorChildrenFromXToY.displayName = "mirror children from X to Y";
TagComp_MirrorChildrenFromXToY.description = "Makes-so any children of node-x (matching the parameters) are shown as children of node-y. (only usable for claims currently)";
TagComp_MirrorChildrenFromXToY.nodeKeys = ["nodeX", "nodeY"];
AddSchema("TagComp_MirrorChildrenFromXToY", {
    properties: {
        nodeX: { $ref: "UUID" },
        nodeY: { $ref: "UUID" },
        mirrorSupporting: { type: "boolean" },
        mirrorOpposing: { type: "boolean" },
        reversePolarities: { type: "boolean" },
        disableDirectChildren: { type: "boolean" },
    },
});
export class TagComp_XIsExtendedByY extends TagComp {
    constructor(initialData) {
        super();
        CE(this).VSet(initialData);
    }
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
TagComp_XIsExtendedByY.displayName = "X is extended by Y (composite)";
TagComp_XIsExtendedByY.description = CE(`
		Meaning: claim Y is the same as claim X, except it is wider-scoped (and thus weaker) than X -- along some consistent axis/criteria of a series.
		Example: X (we should charge at least $50) is extended by Y (we should charge at least $100).
		Effect: Makes-so any con-args of X (base) are mirrored as con-args of Y (extension), and any pro-args of Y (extension) are mirrored as pro-args of X (base).
	`).AsMultiline(0);
TagComp_XIsExtendedByY.nodeKeys = ["nodeX", "nodeY"];
AddSchema("TagComp_XIsExtendedByY", {
    properties: {
        nodeX: { $ref: "UUID" },
        nodeY: { $ref: "UUID" },
    },
});
export class TagComp_MutuallyExclusiveGroup extends TagComp {
    constructor(initialData) {
        super();
        this.nodes = [];
        this.mirrorXProsAsYCons = true;
        CE(this).VSet(initialData);
    }
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
TagComp_MutuallyExclusiveGroup.displayName = "mutually exclusive group (composite)";
TagComp_MutuallyExclusiveGroup.description = CE(`
		Marks a set of nodes as being mutually exclusive with each other.
		(common use: having each one's pro-args be mirrored as con-args of the others)
	`).AsMultiline(0);
TagComp_MutuallyExclusiveGroup.nodeKeys = ["nodes"];
AddSchema("TagComp_MutuallyExclusiveGroup", {
    properties: {
        nodes: { items: { $ref: "UUID" } },
        mirrorXProsAsYCons: { type: "boolean" },
    },
});
export class TagComp_RestrictMirroringOfX extends TagComp {
    constructor(initialData) {
        super();
        this.blacklistAllMirrorParents = true;
        this.blacklistedMirrorParents = [];
        CE(this).VSet(initialData);
    }
}
TagComp_RestrictMirroringOfX.displayName = "restrict mirroring of X";
TagComp_RestrictMirroringOfX.description = "Restricts mirroring of node X, by blacklisting certain mirror-parents, or mirror-parents in general.";
TagComp_RestrictMirroringOfX.nodeKeys = ["nodeX", "blacklistedMirrorParents"];
AddSchema("TagComp_RestrictMirroringOfX", {
    properties: {
        nodeX: { $ref: "UUID" },
        blacklistAllMirrorParents: { type: "boolean" },
        blacklistedMirrorParents: { items: { $ref: "UUID" } },
    },
});
// tag comp meta
// ==========
export const TagComp_classes = [
    TagComp_MirrorChildrenFromXToY,
    TagComp_XIsExtendedByY,
    TagComp_MutuallyExclusiveGroup,
    TagComp_RestrictMirroringOfX,
];
CalculateTagCompClassStatics();
export const TagComp_keys = TagComp_classes.map(c => c.key);
export const TagComp_names = TagComp_classes.map(c => c.displayName);
// use class-names to calculate keys and display-names
function CalculateTagCompClassStatics() {
    var _a, _b;
    for (const compClass of TagComp_classes) {
        compClass.key = (_a = compClass.key, (_a !== null && _a !== void 0 ? _a : CalculateTagCompKey(compClass.name)));
        compClass.displayName = (_b = compClass.displayName, (_b !== null && _b !== void 0 ? _b : CalculateTagCompDisplayName(compClass.name)));
    }
}
export function CalculateTagCompKey(className) {
    //return GetSchemaJSON("MapNodeTag").properties.Pairs().find(a=>a.value.$ref == className).key;
    let displayName = className.replace(/TagComp_/, "");
    displayName = ModifyString(displayName, m => [m.startUpper_to_lower]);
    return displayName;
}
export function GetTagCompClassByKey(key) {
    return TagComp_classes.find(a => a.key == key);
}
export function CalculateTagCompDisplayName(className) {
    const autoSlotNames = ["x", "y", "z"];
    let displayName = className.replace(/TagComp_/, "");
    displayName = ModifyString(displayName, m => [m.startUpper_to_lower, m.lowerUpper_to_lowerSpaceLower]);
    for (const slotName of autoSlotNames) {
        displayName = displayName.replace(new RegExp(`(^| )${slotName}( |$)`), slotName.toUpperCase());
    }
    return displayName;
}
export function GetTagCompClassByDisplayName(displayName) {
    return TagComp_classes.find(a => a.displayName == displayName);
}
export function GetTagCompClassByTag(tag) {
    return TagComp_classes.find(a => a.key in tag);
}
export function GetTagCompOfTag(tag) {
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
export function CalculateNodeIDsForTagComp(tagComp, compClass) {
    /*let compClass = GetTagCompClassByTag(tag);
    let comp = GetTagCompOfTag(tag);*/
    //let compClass = GetTagCompClassByKey(tagComp["_key"]);
    return CE(compClass.nodeKeys).SelectMany(key => {
        let nodeKeyValue = tagComp[key];
        let nodeIDsForKey = Array.isArray(nodeKeyValue) ? nodeKeyValue : [nodeKeyValue];
        return nodeIDsForKey.filter(nodeID => Validate("UUID", nodeID) == null);
    });
}

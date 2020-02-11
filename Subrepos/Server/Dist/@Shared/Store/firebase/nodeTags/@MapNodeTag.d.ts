export declare class MapNodeTag {
    constructor(initialData: Partial<MapNodeTag>);
    _key?: string;
    creator: string;
    createdAt: number;
    nodes: string[];
    mirrorChildrenFromXToY: TagComp_MirrorChildrenFromXToY;
    xIsExtendedByY: TagComp_XIsExtendedByY;
    mutuallyExclusiveGroup: TagComp_MutuallyExclusiveGroup;
    restrictMirroringOfX: TagComp_RestrictMirroringOfX;
}
export declare abstract class TagComp {
    static key: string;
    static displayName: string;
    static description: string;
    static nodeKeys: string[];
    /** Has side-effect: Casts data to its original class/type. */
    GetFinalTagComps(): TagComp[];
}
export declare class TagComp_MirrorChildrenFromXToY extends TagComp {
    static displayName: string;
    static description: string;
    static nodeKeys: string[];
    constructor(initialData?: Partial<TagComp_MirrorChildrenFromXToY>);
    nodeX: string;
    nodeY: string;
    mirrorSupporting: boolean;
    mirrorOpposing: boolean;
    reversePolarities: boolean;
    disableDirectChildren: boolean;
}
export declare class TagComp_XIsExtendedByY extends TagComp {
    static displayName: string;
    static description: string;
    static nodeKeys: string[];
    constructor(initialData?: Partial<TagComp_XIsExtendedByY>);
    nodeX: string;
    nodeY: string;
    GetFinalTagComps(): TagComp[];
}
export declare class TagComp_MutuallyExclusiveGroup extends TagComp {
    static displayName: string;
    static description: string;
    static nodeKeys: string[];
    constructor(initialData?: Partial<TagComp_MutuallyExclusiveGroup>);
    nodes: string[];
    mirrorXProsAsYCons: boolean;
    GetFinalTagComps(): TagComp[];
}
export declare class TagComp_RestrictMirroringOfX extends TagComp {
    static displayName: string;
    static description: string;
    static nodeKeys: string[];
    constructor(initialData?: Partial<TagComp_RestrictMirroringOfX>);
    nodeX: string;
    blacklistAllMirrorParents: boolean;
    blacklistedMirrorParents: string[];
}
export declare const TagComp_classes: readonly [typeof TagComp_MirrorChildrenFromXToY, typeof TagComp_XIsExtendedByY, typeof TagComp_MutuallyExclusiveGroup, typeof TagComp_RestrictMirroringOfX];
export declare type TagComp_Class = typeof TagComp_classes[number];
export declare const TagComp_keys: string[];
export declare const TagComp_names: string[];
export declare function CalculateTagCompKey(className: string): string;
export declare function GetTagCompClassByKey(key: string): typeof TagComp_MirrorChildrenFromXToY | typeof TagComp_XIsExtendedByY | typeof TagComp_MutuallyExclusiveGroup | typeof TagComp_RestrictMirroringOfX;
export declare function CalculateTagCompDisplayName(className: string): string;
export declare function GetTagCompClassByDisplayName(displayName: string): typeof TagComp_MirrorChildrenFromXToY | typeof TagComp_XIsExtendedByY | typeof TagComp_MutuallyExclusiveGroup | typeof TagComp_RestrictMirroringOfX;
export declare function GetTagCompClassByTag(tag: MapNodeTag): typeof TagComp_MirrorChildrenFromXToY | typeof TagComp_XIsExtendedByY | typeof TagComp_MutuallyExclusiveGroup | typeof TagComp_RestrictMirroringOfX;
export declare function GetTagCompOfTag(tag: MapNodeTag): TagComp;
export declare function CalculateNodeIDsForTagComp(tagComp: TagComp, compClass: TagComp_Class): any[];

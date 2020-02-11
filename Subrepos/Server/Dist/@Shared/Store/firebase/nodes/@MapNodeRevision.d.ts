import { QuoteAttachment } from "../nodeRevisions/@QuoteAttachment";
import { MapType } from "../maps/@Map";
import { ImageAttachment } from "../nodeRevisions/@ImageAttachment";
import { AccessLevel } from "./@MapNode";
import { EquationAttachment } from "../nodeRevisions/@EquationAttachment";
import { TermAttachment } from "../nodeRevisions/@TermAttachment";
import { ReferencesAttachment } from "../nodeRevisions/@ReferencesAttachment";
export declare type TitleKey = "base" | "negation" | "yesNoQuestion";
export declare const TitleKey_values: string[];
export declare class TitlesMap {
    base?: string;
    negation?: string;
    yesNoQuestion?: string;
    allTerms?: {
        [key: string]: boolean;
    };
}
export declare enum PermissionInfoType {
    Creator = 10,
    MapEditors = 20,
    Anyone = 30
}
export declare class PermissionInfo {
    constructor(initialData: Partial<PermissionInfo>);
    type: PermissionInfoType;
}
export declare const MapNodeRevision_Defaultable_props: readonly ["accessLevel", "votingDisabled", "permission_edit", "permission_contribute"];
export declare type MapNodeRevision_Defaultable = Pick<MapNodeRevision, "accessLevel" | "votingDisabled" | "permission_edit" | "permission_contribute">;
export declare function MapNodeRevision_Defaultable_DefaultsForMap(mapType: MapType): MapNodeRevision_Defaultable;
export declare class MapNodeRevision {
    constructor(initialData: Partial<MapNodeRevision>);
    _key?: string;
    node: string;
    creator?: string;
    createdAt: number;
    titles: TitlesMap;
    note: string;
    termAttachments: TermAttachment[];
    argumentType: ArgumentType;
    equation: EquationAttachment;
    references: ReferencesAttachment;
    quote: QuoteAttachment;
    image: ImageAttachment;
    accessLevel: AccessLevel;
    votingDisabled: boolean;
    permission_edit: PermissionInfo;
    permission_contribute: PermissionInfo;
    fontSizeOverride: number;
    widthOverride: number;
}
export declare const MapNodeRevision_titlePattern = "^\\S.*$";
export declare enum ArgumentType {
    Any = 10,
    AnyTwo = 15,
    All = 20
}
export declare function GetArgumentTypeDisplayText(type: ArgumentType): any;

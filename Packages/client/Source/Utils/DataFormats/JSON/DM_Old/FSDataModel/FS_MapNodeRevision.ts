import {GetValues_ForSchema, CE} from "js-vextensions";
import {FS_TermAttachment, FS_EquationAttachment, FS_ReferencesAttachment, FS_QuoteAttachment, FS_MediaAttachment} from "./FS_Attachments";
import {FS_AccessLevel} from "./FS_MapNode";

// classes to help with importing data from old firestore-based version of Debate Map
// from: https://github.com/debate-map/server-old/blob/master/Source/%40Shared/Store/firebase/nodes/%40MapNodeRevision.ts

export type FS_TitleKey = "base" | "negation" | "yesNoQuestion";
export class FS_TitlesMap {
	base?: string;
	negation?: string;
	yesNoQuestion?: string;

	// allTerms?: string[];
	// allTerms?: ObservableMap<string, boolean>;
	allTerms?: {[key: string]: boolean};
}
export enum FS_PermissionInfoType {
	Creator = 10,
	MapEditors = 20,
	Anyone = 30,
}
export class FS_PermissionInfo {
	type: FS_PermissionInfoType;
}
export class FS_MapNodeRevision {
	_key?: string;
	node: string; // probably todo: rename to nodeID
	creator?: string; // probably todo: rename to creatorID
	createdAt: number;

	// text
	titles = {base: ""} as FS_TitlesMap;
	note: string;
	termAttachments: FS_TermAttachment[];
	argumentType: FS_ArgumentType;

	// attachment
	equation: FS_EquationAttachment;
	references: FS_ReferencesAttachment;
	quote: FS_QuoteAttachment;
	media: FS_MediaAttachment;

	// permissions
	// only applied client-side; would need to be in protected branch of tree (or use a long, random, and unreferenced node-id) to be "actually" inaccessible
	accessLevel = FS_AccessLevel.Basic;
	// voteLevel = AccessLevel.Basic;
	votingDisabled: boolean;
	permission_edit: FS_PermissionInfo;
	permission_contribute: FS_PermissionInfo;

	// others
	fontSizeOverride: number;
	widthOverride: number;
}
export enum FS_ArgumentType {
	Any = 10,
	AnyTwo = 15,
	All = 20,
}
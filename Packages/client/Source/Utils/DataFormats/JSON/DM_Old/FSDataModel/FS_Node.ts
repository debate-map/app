import {GetValues_ForSchema, CE} from "js-vextensions";
import {UUID} from "mobx-graphlink";
import {FS_NodeRevision} from "./FS_NodeRevision.js";

// classes to help with importing data from old firestore-based version of Debate Map
// from: https://github.com/debate-map/server-old/blob/master/Source/%40Shared/Store/firebase/nodes/%40MapNode.ts

// these are 22-chars, matching 22-char uuids/slug-ids
const globalMapID = "GLOBAL_MAP_00000000001";
const globalRootNodeID = "GLOBAL_ROOT_0000000001";

export enum FS_AccessLevel {
	Basic = 10,
	Verified = 20, // for accounts we're pretty sure are legitimate (an actual person's only account)
	Mod = 30,
	Admin = 40,
}

export enum FS_ClaimForm {
	Base = 10,
	Negation = 20,
	YesNoQuestion = 30,
}

export enum FS_NodeType {
	Category = 10,
	Package = 20,
	MultiChoiceQuestion = 30,
	Claim = 40,
	Argument = 50,
}

export class FS_NodeL1 {
	_key?: string;
	type?: FS_NodeType;
	creator?: string;
	createdAt: number;
	rootNodeForMap?: string;
	ownerMapID?: string;
	currentRevision: string;
	parents: FS_ParentSet;
	children: FS_ChildSet;
	childrenOrder: UUID[];
	multiPremiseArgument?: boolean;
	layerPlusAnchorParents: FS_LayerPlusAnchorParentSet;
}
export interface FS_NodeL2 extends FS_NodeL1 {
	current: FS_NodeRevision;
}
export interface FS_NodeL3 extends FS_NodeL2 {
	displayPolarity: FS_Polarity;
	link: FS_ChildEntry;

	// added during export (see: https://github.com/debate-map/app/blob/client_old/Source/UI/%40Shared/Maps/Node/NodeUI_Menu/MI_ExportSubtree.tsx)
	childrenData?: {[key: string]: FS_NodeL3};
}

export enum FS_Polarity {
	Supporting = 10,
	Opposing = 20,
}

// regular parents
// ==========

export type FS_ParentSet = { [key: string]: FS_ParentEntry; };
export type FS_ParentEntry = { _: boolean; };

export type FS_ChildSet = { [key: string]: FS_ChildEntry; };
export type FS_ChildEntry = {
	_: boolean;
	form?: FS_ClaimForm;
	seriesAnchor?: boolean;
	polarity?: FS_Polarity;

	// runtime only
	_mirrorLink?: boolean;
};

export enum FS_ChildOrderType {
	Manual = 10,
	ByRating = 20,
}

// layer+anchor parents (for if subnode)
// ==========

export type FS_LayerPlusAnchorParentSet = { [key: string]: boolean; };
import {Assert} from "../../../Frame/General/Assert";
import {URL} from "../../../Frame/General/URLs";
import {MapNode, ThesisForm, ChildEntry, MapNodeEnhanced} from "./@MapNode";
import {RatingType} from "../nodeRatings/@RatingType";
import {MetaThesis_ThenType, GetMetaThesisIfTypeDisplayText, MetaThesis_ThenType_Info} from "./@MetaThesisInfo";
import {MapNodeType_Info, MapNodeType} from "./@MapNodeType";
import {IsLinkValid, IsNewLinkValid, GetParentNode} from "../nodes";
import {GetValues} from "../../../Frame/General/Enums";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";
import {CachedTransform} from "../../../Frame/V/VCache";
import {ReverseThenType} from "./$node/$metaThesis";
import {SlicePath} from "../../../UI/@Shared/Maps/MapNode/NodeUI/RatingsPanel";

export function GetFontSizeForNode(node: MapNode) {
	return node.metaThesis ? 11 : 14;
}
export function GetPaddingForNode(node: MapNode) {
	return node.metaThesis ? "1px 4px 2px" : "5px 5px 4px";
}
export type RatingTypeInfo = {type: RatingType, main: boolean};
/** If passed an (un-enhanced) MapNode, this will fail to realize a yes-no-question thesis has "significance" as its main rating type. */
export function GetRatingTypesForNode(node: MapNode | MapNodeEnhanced): RatingTypeInfo[] {
	if (node.type == MapNodeType.Category) {
		if (node._id < 100) // if static category, don't have any voting
			return [];
		return [{type: "significance", main: true}];
	}
	if (node.type == MapNodeType.Package)
		return [{type: "significance", main: true}];
	if (node.type == MapNodeType.MultiChoiceQuestion)
		return [{type: "significance", main: true}];
	if (node.type == MapNodeType.Thesis) {
		if (node.metaThesis) {
			if (node.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis.thenType == MetaThesis_ThenType.WeakenParent)
				return [{type: "adjustment", main: true}];
			return [{type: "probability", main: true}];
		}

		let result: RatingTypeInfo[];
		if (node.relative) {
			result = [{type: "degree", main: true}, {type: "probability", main: true}, {type: "significance", main: true}];
		} else {
			result = [{type: "probability", main: true}, {type: "degree", main: true}, {type: "significance", main: true}];
		}
		/*if ((node as MapNodeEnhanced).link && (node as MapNodeEnhanced).link.form == ThesisForm.YesNoQuestion) {
			result.Remove(result.First(a=>a.type == "significance"));
			result.Insert(0, {type: "significance", main: true});
		}*/
		return result;
	}
	if (node.type == MapNodeType.SupportingArgument)
		return [{type: "strength", main: true}];
	if (node.type == MapNodeType.OpposingArgument)
		return [{type: "strength", main: true}];
	Assert(false);
}
export function GetMainRatingType(node: MapNodeEnhanced): RatingType {
	return GetRatingTypesForNode(node).FirstOrX(null, {}).type;
}
export function GetSortByRatingType(node: MapNodeEnhanced): RatingType {
	if ((node as MapNodeEnhanced).link && (node as MapNodeEnhanced).link.form == ThesisForm.YesNoQuestion) {
		return "significance";
	}
	return GetMainRatingType(node);
}

export function ReverseMapNodeType(nodeType: MapNodeType) {
	if (nodeType == MapNodeType.SupportingArgument) return MapNodeType.OpposingArgument;
	if (nodeType == MapNodeType.OpposingArgument) return MapNodeType.SupportingArgument;
	return nodeType;
}

export function GetFinalNodeTypeAtPath(node: MapNode, path: string): MapNodeType {
	let result = node.type;
	if (node.type == MapNodeType.SupportingArgument || node.type == MapNodeType.OpposingArgument) {
		let parent = GetParentNode(path);
		let parentForm = GetThesisFormAtPath(parent, path.split("/").slice(0, -1).join("/"));
		if (parentForm == ThesisForm.Negation)
			result = ReverseMapNodeType(node.type);
	}
	return result;
}
export function GetNodeEnhanced(node: MapNode, path: string) {
	// if any of the data in a MapNodeEnhanced is not loaded yet, just return null (we want it to be all or nothing)
	if (node == null) return null;
	let node_finalType = GetFinalNodeTypeAtPath(node, path);
	if (node_finalType == null) return null;
	let parent = GetParentNode(path);
	if (parent == null && path.Contains("/")) return null;
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null && path.Contains("/")) return null;

	let nodeEnhanced = node.Extended({finalType: node_finalType, link}) as MapNodeEnhanced;
	return CachedTransform("GetNodeEnhanced", {path}, nodeEnhanced, ()=>nodeEnhanced);
}

export function GetThesisFormAtPath(node: MapNode, path: string): ThesisForm {
	let parent = GetParentNode(path);
	return GetNodeForm(node, parent);
}
/*export function GetThesisFormUnderParent(node: MapNode, parent: MapNode): ThesisForm {
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ThesisForm.Base;
	return link.form;
}*/
export function GetNodeForm(node: MapNode | MapNodeEnhanced, parent?: MapNode) {
	if ((node as MapNodeEnhanced).link) {
		return (node as MapNodeEnhanced).link.form;
	}
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ThesisForm.Base;
	return link.form;
}
export function GetLinkUnderParent(nodeID: number, parent: MapNode): ChildEntry {
	if (parent == null) return null;
	let link = parent.children[nodeID];
	return link;
}

export function IsNodeTitleValid_GetError(node: MapNode, title: string) {
	if (title.trim().length == 0) return "Title cannot be empty.";
	return null;
}

export function GetNodeDisplayText(node: MapNode, formOrPath?: ThesisForm | string): string {
	if (node.type == MapNodeType.Thesis) {
		if (node.contentNode) {
			return `The statement below was made`
				+ (node.contentNode.sourceChains[0][0].name ? ` in "${node.contentNode.sourceChains[0][0].name}"` : "")
				+ (node.contentNode.sourceChains[0][0].author ? ` by ${node.contentNode.sourceChains[0][0].author}` : "")
				+ (node.contentNode.sourceChains[0][0].link ? ` at "${
					URL.Parse(node.contentNode.sourceChains[0][0].link, false).toString({domain_protocol: false, forceSlashAfterDomain: false})}"` : "") // maybe temp
				+ `, and is unmodified.`;
		}
		if (node.metaThesis) {
			let thenType_final = node.metaThesis.thenType;
			let parent = IsString(formOrPath) ? GetParentNode(formOrPath as string) : null;
			if (parent && GetNodeEnhanced(parent, SlicePath(formOrPath as string, 1)).finalType != parent.type)
				thenType_final = ReverseThenType(thenType_final);
			return `If ${GetMetaThesisIfTypeDisplayText(node.metaThesis.ifType)} premises below are true, they ${
				MetaThesis_ThenType_Info.for[MetaThesis_ThenType[thenType_final]].displayText}.`;
		}

		if (formOrPath) {
			let form = typeof formOrPath == "string" ? GetThesisFormAtPath(node, formOrPath) : formOrPath;
			if (form == ThesisForm.Negation)
				return node.titles["negation"] || "[negation title not set]";
			if (form == ThesisForm.YesNoQuestion)
				return node.titles["yesNoQuestion"] || "[yes-no-question title not set]";
			return node.titles["base"] || "[base title not set]";
		}
	}
	return node.titles["base"] || node.titles["yesNoQuestion"] || node.titles["negation"] || "";
}

export function GetValidChildTypes(nodeType: MapNodeType, path: string) {
	let nodeTypes = GetValues<MapNodeType>(MapNodeType);
	let validChildTypes = nodeTypes.filter(type=>IsLinkValid(nodeType, path, {type} as any));
	return validChildTypes;
}
export function GetValidNewChildTypes(nodeType: MapNodeType, path: string, permissions: PermissionGroupSet) {
	let nodeTypes = GetValues<MapNodeType>(MapNodeType);
	let validChildTypes = nodeTypes.filter(type=>IsNewLinkValid(nodeType, path, {type} as any, permissions));
	return validChildTypes;
}

export function IsContextReversed(node: MapNode, parent: MapNodeEnhanced) {
	return node.metaThesis && parent.finalType != parent.type;
}
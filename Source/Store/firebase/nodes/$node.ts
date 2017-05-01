import {URL} from "../../../Frame/General/URLs";
import {MapNode, ThesisForm} from "./@MapNode";
import {RatingType} from "../nodeRatings/@RatingType";
import {MetaThesis_ThenType, GetMetaThesisIfTypeDisplayText, MetaThesis_ThenType_Info} from "./@MetaThesisInfo";
import {MapNodeType_Info, MapNodeType} from "./@MapNodeType";
import {GetParentNode, IsLinkValid, IsNewLinkValid} from "../nodes";
import {GetValues} from "../../../Frame/General/Enums";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";

export function GetFontSizeForNode(node: MapNode) {
	return node.metaThesis ? 11 : 14;
}
export function GetPaddingForNode(node: MapNode) {
	return node.metaThesis ? "1px 4px 2px" : "5px 5px 4px";
}
export function GetMainRatingTypesForNode(node: MapNode): RatingType[] {
	if (node._id < 100) // if static category, don't have any voting
		return [];
	if (node.metaThesis) {
		if (node.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis.thenType == MetaThesis_ThenType.WeakenParent)
			return ["adjustment"];
		return ["probability"];
	}
	return MapNodeType_Info.for[node.type].mainRatingTypes;
}

export function GetThesisFormAtPath(node: MapNode, path: string): ThesisForm {
	let parent = GetParentNode(path);
	if (parent == null) return ThesisForm.Base;
	let link = parent.children[node._id];
	if (link == null) return ThesisForm.Base;
	return link.form;
}

export function IsNodeTitleValid_GetError(node: MapNode, title: string) {
	if (title.trim().length == 0) return "Title cannot be empty.";
	return null;
}

export function GetNodeDisplayText(node: MapNode, formOrPath?: ThesisForm | string) {
	if (node.type == MapNodeType.Thesis) {
		if (node.contentNode)
			return `The statement below was made`
				+ (node.contentNode.sourceChains[0][0].name ? ` in "${node.contentNode.sourceChains[0][0].name}"` : "")
				+ (node.contentNode.sourceChains[0][0].author ? ` by ${node.contentNode.sourceChains[0][0].author}` : "")
				+ (node.contentNode.sourceChains[0][0].link ? ` at "${
					URL.Parse(node.contentNode.sourceChains[0][0].link).VAct(a=>a.domain = a.DomainWithoutProtocol).toString(true, false)}"` : "") // maybe temp
				+ `, and is unmodified.`;
		if (node.metaThesis) {
			return `If ${GetMetaThesisIfTypeDisplayText(node.metaThesis.ifType)} premises below are true, they ${
				MetaThesis_ThenType_Info.for[MetaThesis_ThenType[node.metaThesis.thenType]].displayText}.`;
		}

		if (formOrPath) {
			let form = typeof formOrPath == "string" ? GetThesisFormAtPath(node, formOrPath) : formOrPath;
			if (form == ThesisForm.Negation)
				return node.titles["negation"] || "";
			if (form == ThesisForm.YesNoQuestion)
				return node.titles["yesNoQuestion"] || "";
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
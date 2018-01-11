import {GetImage} from '../images';
import {MapNode, MapNodeL2, ThesisForm, ChildEntry, ThesisType, MapNodeL3} from "./@MapNode";
import {RatingType} from "../nodeRatings/@RatingType";
import {MetaThesis_ThenType, GetMetaThesisIfTypeDisplayText, MetaThesis_ThenType_Info, MetaThesis_IfType} from "./@MetaThesisInfo";
import {MapNodeType} from './@MapNodeType';
import {GetParentNode, IsLinkValid, IsNewLinkValid, IsNodeSubnode, GetNode, GetParentNodeL2} from "../nodes";
import {GetValues} from '../../../Frame/General/Enums';
import {PermissionGroupSet} from '../userExtras/@UserExtraInfo';
import {ReverseThenType} from './$node/$metaThesis';
import {ImageType, GetNiceNameForImageType} from "../images/@Image";
import katex from "katex";
import {PreProcessLatex} from "../../../UI/@Shared/Maps/MapNode/NodeMathUI";
import {SplitStringBySlash_Cached} from "../../../Frame/Database/StringSplitCache";
import {SlicePath} from "../../../Frame/Database/DatabaseHelpers";
import {VURL, CachedTransform} from "js-vextensions";
import {MapNodeRevision} from "./@MapNodeRevision";
import {GetNodeRevision} from "../nodeRevisions";

export function GetFontSizeForNode(node: MapNodeL2, isSubnode = false) {
	if (node.current.fontSizeOverride) return node.current.fontSizeOverride;
	if (node.current.metaThesis) return 11;
	if (node.current.equation) return node.current.equation.latex ? 14 : 13;
	if (isSubnode) return 11;
	return 14;
}
export function GetPaddingForNode(node: MapNodeL2, isSubnode = false) {
	return (node.current.metaThesis || isSubnode) ? "1px 4px 2px" : "5px 5px 4px";
}
export type RatingTypeInfo = {type: RatingType, main: boolean};
export function GetRatingTypesForNode(node: MapNodeL2): RatingTypeInfo[] {
	if (node.current.type == MapNodeType.Category) {
		if (node.current.votingDisabled) return [];
		return [{type: "significance", main: true}];
	}
	if (node.current.type == MapNodeType.Package)
		return [{type: "significance", main: true}];
	if (node.current.type == MapNodeType.MultiChoiceQuestion)
		return [{type: "significance", main: true}];
	if (node.current.type == MapNodeType.Thesis) {
		if (node.current.metaThesis) {
			if (node.current.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || node.current.metaThesis.thenType == MetaThesis_ThenType.WeakenParent)
				return [{type: "adjustment", main: true}];
			return [{type: "probability", main: true}];
		}

		let result: RatingTypeInfo[];
		if (node.current.relative) {
			result = [{type: "degree", main: true}, {type: "probability", main: true}, {type: "significance", main: true}];
		} else {
			result = [{type: "probability", main: true}, {type: "degree", main: true}, {type: "significance", main: true}];
		}
		/*if ((node as MapNodeL2).link && (node as MapNodeL2).link.form == ThesisForm.YesNoQuestion) {
			result.Remove(result.First(a=>a.type == "significance"));
			result.Insert(0, {type: "significance", main: true});
		}*/
		return result;
	}
	if (node.current.type == MapNodeType.SupportingArgument)
		return [{type: "strength", main: true}];
	if (node.current.type == MapNodeType.OpposingArgument)
		return [{type: "strength", main: true}];
	Assert(false);
}
export function GetMainRatingType(node: MapNodeL2): RatingType {
	return GetRatingTypesForNode(node).FirstOrX(null, {}).type;
}
export function GetSortByRatingType(node: MapNodeL3): RatingType {
	if ((node as MapNodeL3).link && (node as MapNodeL3).link.form == ThesisForm.YesNoQuestion) {
		return "significance";
	}
	return GetMainRatingType(node);
}

export function IsReversedArgumentNode(node: MapNodeL3) {
	return node.finalType != node.current.type;
}
export function ReverseMapNodeType(nodeType: MapNodeType) {
	if (nodeType == MapNodeType.SupportingArgument) return MapNodeType.OpposingArgument;
	if (nodeType == MapNodeType.OpposingArgument) return MapNodeType.SupportingArgument;
	return nodeType;
}

export function GetFinalNodeTypeAtPath(node: MapNodeL2, path: string): MapNodeType {
	let result = node.current.type;
	if (node.current.type == MapNodeType.SupportingArgument || node.current.type == MapNodeType.OpposingArgument) {
		let parent = GetParentNodeL2(path);
		if (parent != null) { // can be null, if for NodeUI_ForBots
			let parentForm = GetNodeForm(parent, SplitStringBySlash_Cached(path).slice(0, -1).join("/"));
			if (parentForm == ThesisForm.Negation) {
				result = ReverseMapNodeType(node.current.type);
			}
		}
	}
	return result;
}
export function IsNodeL1(node): node is MapNode {
	return !node["current"];
}
export function IsNodeL2(node: MapNode): node is MapNodeL2 {
	return node["current"];
}
export function GetNodeL2(nodeID: number | MapNode, path?: string) {
	if (nodeID == null) return null;
	if (IsNumber(nodeID)) nodeID = GetNode(nodeID);
	let node = nodeID as MapNode;
	
	// if any of the data in a MapNodeL2 is not loaded yet, just return null (we want it to be all or nothing)
	let currentRevision = GetNodeRevision(node.currentRevision);
	if (currentRevision == null) return null;

	let nodeL2 = node.Extended({current: currentRevision}) as MapNodeL2;
	return CachedTransform("GetNodeL2", [path], nodeL2, ()=>nodeL2);
}
export function IsNodeL3(node: MapNode): node is MapNodeL2 {
	return node["finalType"] && node["link"];
}
export function GetNodeL3(nodeID: number | MapNode | MapNodeL2, path: string) {
	if (nodeID == null) return null;
	if (IsNumber(nodeID)) nodeID = GetNode(nodeID);
	if (IsNodeL1(nodeID)) nodeID = GetNodeL2(nodeID);
	let node = nodeID as MapNodeL2;
	
	// if any of the data in a MapNodeL3 is not loaded yet, just return null (we want it to be all or nothing)
	let node_finalType = GetFinalNodeTypeAtPath(node, path);
	if (node_finalType == null) return null;

	let isSubnode = IsNodeSubnode(node);
	if (!isSubnode) {
		let parent = GetParentNode(path);
		if (parent == null && path.Contains("/")) return null;
		var link = GetLinkUnderParent(node._id, parent);
		if (link == null && path.Contains("/")) return null;
	}

	let nodeEnhanced = node.Extended({finalType: node_finalType, link}) as MapNodeL3;
	return CachedTransform("GetNodeL3", [path], nodeEnhanced, ()=>nodeEnhanced);
}

/*export function GetNodeForm(node: MapNode, path: string): ThesisForm {
	let parent = GetParentNode(path);
	return GetNodeForm(node, parent);
}
export function GetThesisFormUnderParent(node: MapNode, parent: MapNode): ThesisForm {
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ThesisForm.Base;
	return link.form;
}*/
export function GetNodeForm(node: MapNodeL2 | MapNodeL3, pathOrParent?: string | MapNodeL2) {
	let parent: MapNodeL2 = IsString(pathOrParent) ? GetParentNodeL2(pathOrParent as string) : pathOrParent as MapNodeL2;
	if ((node as MapNodeL3).link) {
		return (node as MapNodeL3).link.form;
	}
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ThesisForm.Base;
	return link.form;
}
export function GetLinkUnderParent(nodeID: number, parent: MapNode): ChildEntry {
	if (parent == null) return null;
	if (parent.children == null) return null; // post-delete, parent-data might have updated before child-data
	let link = parent.children[nodeID];
	return link;
}

export function IsNodeTitleValid_GetError(node: MapNode, title: string) {
	if (title.trim().length == 0) return "Title cannot be empty.";
	return null;
}

/** Gets the main display-text for a node. (doesn't include equation explanation, quote sources, etc.) */
export function GetNodeDisplayText(node: MapNodeL2, formOrPath?: ThesisForm | string): string {
	if (node.current.type == MapNodeType.Thesis) {
		if (node.current.metaThesis) {
			let thenType_final = node.current.metaThesis.thenType;
			let parent = IsString(formOrPath) ? GetParentNodeL2(formOrPath as string) : null;
			if (parent && GetNodeL3(parent, SlicePath(formOrPath as string, 1)).finalType != parent.current.type)
				thenType_final = ReverseThenType(thenType_final);
			return `If ${GetMetaThesisIfTypeDisplayText(node.current.metaThesis.ifType)} premises below are true, they ${
				MetaThesis_ThenType_Info.for[MetaThesis_ThenType[thenType_final]].displayText}.`;
		}
		if (node.current.equation) {
			let result = node.current.equation.text;
			if (node.current.equation.latex && !isBot) {
				//result = result.replace(/\\[^{]+/g, "").replace(/[{}]/g, "");
				let latex = PreProcessLatex(result);
				try {
					let html = katex.renderToString(latex);
					let dom = $(html).children(".katex-html");
					result = dom.text();
				} catch (ex) {
					if (ex.message.startsWith("KaTeX parse error: ")) {
						return ex.message.replace(/^KaTeX/, "LaTeX");
					}
				}
			}
			return result;
		}
		if (node.current.contentNode) {
			return `The statement below was made` //(as shown)`
				+ (node.current.contentNode.sourceChains[0][0].name ? ` in "${node.current.contentNode.sourceChains[0][0].name}"` : "")
				+ (node.current.contentNode.sourceChains[0][0].author ? ` by ${node.current.contentNode.sourceChains[0][0].author}` : "")
				+ (node.current.contentNode.sourceChains[0][0].link ? ` at "${
					VURL.Parse(node.current.contentNode.sourceChains[0][0].link, false).toString({domain_protocol: false})}"` : "") // maybe temp
				+ `.`;
		}
		if (node.current.image) {
			let image = GetImage(node.current.image.id);
			if (image == null) return `...`;
			//if (image.sourceChains == null) return `The ${GetNiceNameForImageType(image.type)} below is unmodified.`; // temp
			return `The ${GetNiceNameForImageType(image.type)} below was published` //(as shown)`
				+ (image.sourceChains[0][0].name ? ` in "${image.sourceChains[0][0].name}"` : "")
				+ (image.sourceChains[0][0].author ? ` by ${image.sourceChains[0][0].author}` : "")
				+ (image.sourceChains[0][0].link ? ` at "${
					VURL.Parse(image.sourceChains[0][0].link, false).toString({domain_protocol: false})}"` : "") // maybe temp
				+ `.`;
		}

		if (formOrPath) {
			let form = typeof formOrPath == "string" ? GetNodeForm(node, formOrPath) : formOrPath;
			if (form == ThesisForm.Negation)
				return node.current.titles["negation"] || "[negation title not set]";
			if (form == ThesisForm.YesNoQuestion)
				return node.current.titles["yesNoQuestion"] || "[yes-no-question title not set]";
			return node.current.titles["base"] || "[base title not set]";
		}
	}
	return node.current.titles["base"] || node.current.titles["yesNoQuestion"] || node.current.titles["negation"] || "";
}

export function GetValidChildTypes(nodeType: MapNodeType, path: string) {
	let nodeTypes = GetValues<MapNodeType>(MapNodeType);
	let validChildTypes = nodeTypes.filter(type=>IsLinkValid(nodeType, path, {type} as any));
	return validChildTypes;
}
export function GetValidNewChildTypes(parentNode: MapNodeL2, path: string, permissions: PermissionGroupSet) {
	let nodeTypes = GetValues<MapNodeType>(MapNodeType);
	let validChildTypes = nodeTypes.filter(type=>IsNewLinkValid(parentNode, path, {type} as any, permissions));
	return validChildTypes;
}

export function IsContextReversed(node: MapNodeL2, parent: MapNodeL3) {
	return node.current.metaThesis && parent && IsReversedArgumentNode(parent);
}

export function GetThesisType(nodeRevision: MapNodeRevision) {
	if (nodeRevision.type != MapNodeType.Thesis) return null;
	return (
		nodeRevision.metaThesis ? ThesisType.MetaThesis :
		nodeRevision.equation ? ThesisType.Equation :
		nodeRevision.contentNode ? ThesisType.Quote :
		nodeRevision.image ? ThesisType.Image :
		ThesisType.Normal
	);
}

/** [pure] */
export function IsArgumentType(type: MapNodeType) {
	return type == MapNodeType.SupportingArgument || type == MapNodeType.OpposingArgument;
}
/** [pure] */
export function IsArgumentNode(node: MapNodeL2) {
	//return IsArgumentType(node.finalType || node.current.type);
	return IsArgumentType(node.current.type);
}
/** [pure] */
/*export function GetMinChildCountToBeVisibleToNonModNonCreators(node: MapNode, nodeChildren: MapNode[]) {
	if (IsArgumentNode(node)) {
		let metaThesisNode = nodeChildren.find(a=>a != null && a.metaThesis != null);
		// if meta-thesis not loaded yet, don't show child yet (since might suppossed to be hidden)
		if (metaThesisNode == null) return Number.MAX_SAFE_INTEGER;
		let minChildCount = metaThesisNode.metaThesis.ifType == MetaThesis_IfType.Any ? 2 : 3;
		return minChildCount;
	}
	return 0;
}
/** [pure] *#/
export function IsNodeVisibleToNonModNonCreators(node: MapNode, nodeChildren: MapNode[]) {
	if (IsArgumentNode(node)) {
		let minChildCount = GetMinChildCountToBeVisibleToNonModNonCreators(node, nodeChildren);
		if (nodeChildren.length < minChildCount) return false;
	}
	return true;
}*/
import {GetImage} from '../images';
import {MapNode, MapNodeL2, ClaimForm, ChildEntry, ClaimType, MapNodeL3, Polarity} from "./@MapNode";
import {RatingType} from "../nodeRatings/@RatingType";
import {ImpactPremise_ThenType, GetImpactPremiseIfTypeDisplayText, ImpactPremise_IfType, GetImpactPremiseThenTypeDisplayText} from "./@ImpactPremiseInfo";
import {MapNodeType} from './@MapNodeType';
import {GetParentNode, IsLinkValid, IsNewLinkValid, IsNodeSubnode, GetNode, GetParentNodeL2} from "../nodes";
import {GetValues} from '../../../Frame/General/Enums';
import {PermissionGroupSet} from '../userExtras/@UserExtraInfo';
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
	if (node.current.impactPremise) return 11;
	if (node.current.equation) return node.current.equation.latex ? 14 : 13;
	if (isSubnode) return 11;
	return 14;
}
export function GetPaddingForNode(node: MapNodeL2, isSubnode = false) {
	return (node.current.impactPremise || isSubnode) ? "1px 4px 2px" : "5px 5px 4px";
}
export type RatingTypeInfo = {type: RatingType, main: boolean};
export function GetRatingTypesForNode(node: MapNodeL2): RatingTypeInfo[] {
	if (node.type == MapNodeType.Category) {
		if (node.current.votingDisabled) return [];
		return [{type: "significance", main: true}];
	}
	if (node.type == MapNodeType.Package)
		return [{type: "significance", main: true}];
	if (node.type == MapNodeType.MultiChoiceQuestion)
		return [{type: "significance", main: true}];
	if (node.type == MapNodeType.Claim) {
		if (node.current.impactPremise) {
			if (node.current.impactPremise.thenType == ImpactPremise_ThenType.Impact)
				return [{type: "impact", main: true}];
			return [{type: "probability", main: true}];
		}

		let result: RatingTypeInfo[];
		if (node.current.relative) {
			result = [{type: "degree", main: true}, {type: "probability", main: true}, {type: "significance", main: true}];
		} else {
			result = [{type: "probability", main: true}, {type: "degree", main: true}, {type: "significance", main: true}];
		}
		/*if ((node as MapNodeL2).link && (node as MapNodeL2).link.form == ClaimForm.YesNoQuestion) {
			result.Remove(result.First(a=>a.type == "significance"));
			result.Insert(0, {type: "significance", main: true});
		}*/
		return result;
	}
	if (node.type == MapNodeType.Argument)
		return [{type: "strength", main: true}];
	Assert(false);
}
export function GetMainRatingType(node: MapNodeL2): RatingType {
	return GetRatingTypesForNode(node).FirstOrX(null, {}).type;
}
export function GetSortByRatingType(node: MapNodeL3): RatingType {
	if ((node as MapNodeL3).link && (node as MapNodeL3).link.form == ClaimForm.YesNoQuestion) {
		return "significance";
	}
	return GetMainRatingType(node);
}

export function ReversePolarity(polarity: Polarity) {
	return polarity == Polarity.Supporting ? Polarity.Opposing : Polarity.Supporting;
}
export function GetFinalPolarityAtPath(node: MapNodeL2, path: string): Polarity {
	Assert(node.type == MapNodeType.Argument, "Only argument nodes have polarity.");
	let parent = GetParentNodeL2(path);
	if (!parent) return Polarity.Supporting; // can be null, if for NodeUI_ForBots
	
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return Polarity.Supporting; // can be null, if path is invalid (eg. copied-node path)

	let parentForm = GetNodeForm(parent, SplitStringBySlash_Cached(path).slice(0, -1).join("/"));
	return GetFinalPolarity(link.polarity, parentForm);
}
export function GetFinalPolarity(basePolarity: Polarity, parentForm: ClaimForm): Polarity {
	let result = basePolarity;
	if (parentForm == ClaimForm.Negation) {
		result = ReversePolarity(result);
	}
	return result;
}
export function IsNodeL1(node): node is MapNode {
	return !node["current"];
}
export function AsNodeL1(node: MapNodeL2 | MapNodeL3) {
	let result = {...node};
	delete result.current;
	delete result["finalPolarity"];
	delete result["link"];
	return result as MapNode;
}

export function IsNodeL2(node: MapNode): node is MapNodeL2 {
	return node["current"];
}
export function AsNodeL2(node: MapNode, currentRevision: MapNodeRevision) {
	let result = node.Extended({current: currentRevision}) as MapNodeL2;
	delete result["finalPolarity"];
	delete result["link"];
	return result;
}
export function GetNodeL2(nodeID: number | MapNode, path?: string) {
	if (IsNumber(nodeID)) nodeID = GetNode(nodeID);
	if (nodeID == null) return null;
	let node = nodeID as MapNode;
	
	// if any of the data in a MapNodeL2 is not loaded yet, just return null (we want it to be all or nothing)
	let currentRevision = GetNodeRevision(node.currentRevision);
	if (currentRevision == null) return null;

	let nodeL2 = AsNodeL2(node, currentRevision);
	return CachedTransform("GetNodeL2", [path], nodeL2, ()=>nodeL2);
}

export function IsNodeL3(node: MapNode): node is MapNodeL2 {
	return node["finalPolarity"] && node["link"];
}
export function AsNodeL3(node: MapNodeL2, finalPolarity?: Polarity, link?: ChildEntry) {
	finalPolarity = finalPolarity || Polarity.Supporting;
	link = link || {
		_: true,
		form: ClaimForm.Base,
		seriesAnchor: false,
		polarity: Polarity.Supporting,
	};
	return node.Extended({finalPolarity, link}) as MapNodeL3;
}
export function GetNodeL3(path: string) {
	if (path == null) return null;
	let nodeID = SplitStringBySlash_Cached(path).Last().ToInt();
	let node = GetNodeL2(nodeID);
	if (node == null) return null;
	
	// if any of the data in a MapNodeL3 is not loaded yet, just return null (we want it to be all or nothing)
	let finalPolarity = null;
	if (node.type == MapNodeType.Argument) {
		finalPolarity = GetFinalPolarityAtPath(node, path);
		if (finalPolarity == null) return null;
	}

	let isSubnode = IsNodeSubnode(node);
	if (!isSubnode) {
		let parent = GetParentNode(path);
		if (parent == null && path.Contains("/")) return null;
		var link = GetLinkUnderParent(node._id, parent);
		if (link == null && path.Contains("/")) return null;
	}

	let nodeL3 = AsNodeL3(node, finalPolarity, link);
	return CachedTransform("GetNodeL3", [path], nodeL3, ()=>nodeL3);
}

/*export function GetNodeForm(node: MapNode, path: string): ClaimForm {
	let parent = GetParentNode(path);
	return GetNodeForm(node, parent);
}
export function GetClaimFormUnderParent(node: MapNode, parent: MapNode): ClaimForm {
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ClaimForm.Base;
	return link.form;
}*/
export function GetNodeForm(node: MapNodeL2 | MapNodeL3, pathOrParent?: string | MapNodeL2) {
	if ((node as MapNodeL3).link) {
		return (node as MapNodeL3).link.form;
	}
	
	let parent: MapNodeL2 = IsString(pathOrParent) ? GetParentNodeL2(pathOrParent as string) : pathOrParent as MapNodeL2;
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ClaimForm.Base;
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
export function GetNodeDisplayText(node: MapNodeL2, path?: string, form?: ClaimForm): string {
	form = form || GetNodeForm(node, path);

	if (node.type == MapNodeType.Claim) {
		if (node.current.impactPremise) {
			//Assert(path, "Path must be supplied if getting display-text for an impact-premise.");
			let parentNodeID = node.parents.VKeys(true)[0];
			path = path || `${parentNodeID}/${node._id}`;
			
			let thenType = node.current.impactPremise.thenType;
			let argument = GetParentNodeL2(path);
			var argumentFinalPolarity = argument ? GetFinalPolarityAtPath(argument, SlicePath(path, 1)) : Polarity.Supporting;
			return `If ${GetImpactPremiseIfTypeDisplayText(node.current.impactPremise.ifType)} premises below are true, they ${GetImpactPremiseThenTypeDisplayText(thenType, argumentFinalPolarity)}.`;
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

		if (form) {
			if (form == ClaimForm.Negation)
				return node.current.titles["negation"] || "[negation title not set]";
			if (form == ClaimForm.YesNoQuestion)
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

/*export function IsContextReversed(node: MapNodeL2, parent: MapNodeL3) {
	return node.current.impactPremise && parent && IsReversedArgumentNode(parent);
}*/

export function GetClaimType(node: MapNodeL2) {
	if (node.type != MapNodeType.Claim) return null;
	return (
		node.current.impactPremise ? ClaimType.ImpactPremise :
		node.current.equation ? ClaimType.Equation :
		node.current.contentNode ? ClaimType.Quote :
		node.current.image ? ClaimType.Image :
		ClaimType.Normal
	);
}

/** [pure] */
/*export function GetMinChildCountToBeVisibleToNonModNonCreators(node: MapNode, nodeChildren: MapNode[]) {
	if (IsArgumentNode(node)) {
		let impactPremiseNode = nodeChildren.find(a=>a != null && a.impactPremise != null);
		// if impact-premise not loaded yet, don't show child yet (since might suppossed to be hidden)
		if (impactPremiseNode == null) return Number.MAX_SAFE_INTEGER;
		let minChildCount = impactPremiseNode.impactPremise.ifType == ImpactPremise_IfType.Any ? 2 : 3;
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
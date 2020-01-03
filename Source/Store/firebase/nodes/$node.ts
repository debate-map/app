import {Assert, CachedTransform, GetValues, IsString, VURL, E} from "js-vextensions";
import katex from "katex";
import {SplitStringBySlash_Cached, SlicePath, StoreAccessor} from "mobx-firelink";
import {GetImage} from "../images";
import {GetNiceNameForImageType} from "../images/@Image";
import {RatingType} from "../nodeRatings/@RatingType";
import {GetNodeRevision} from "../nodeRevisions";
import {ForLink_GetError, ForNewLink_GetError, GetNode, GetNodeChildrenL2, GetNodeID, GetParentNode, GetParentNodeL2, HolderType, IsNodeSubnode} from "../nodes";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";
import {ChildEntry, ClaimForm, MapNode, MapNodeL2, MapNodeL3, Polarity} from "./@MapNode";
import {MapNodeRevision, TitlesMap, TitlesMap_baseKeys} from "./@MapNodeRevision";
import {MapNodeType} from "./@MapNodeType";

export function PreProcessLatex(text: string) {
	// text = text.replace(/\\term{/g, "\\text{");
	// "\term{some-term}{123}" -> "\text{@term[some-term,123]}
	text = text.replace(/\\term{(.+?)}{([A-Za-z0-9_-]+?)}/g, (m, g1, g2)=>`\\text{@term[${g1},${g2}]}`);
	text = text.replace(/\\term/g, ()=>"[syntax wrong]"); // for user syntax mistakes, keep from causing error
	return text;
}

export function GetFontSizeForNode(node: MapNodeL2, isSubnode = false) {
	if (node.current.fontSizeOverride) return node.current.fontSizeOverride;
	if (node.current.equation) return node.current.equation.latex ? 14 : 13;
	if (isSubnode) return 11;
	return 14;
}
export function GetPaddingForNode(node: MapNodeL2, isSubnode = false) {
	return isSubnode ? "1px 4px 2px" : "5px 5px 4px";
}
export type RatingTypeInfo = {type: RatingType, main?: boolean, collapsed?: boolean};
export function GetRatingTypesForNode(node: MapNodeL2): RatingTypeInfo[] {
	if (node.type == MapNodeType.Category) {
		if (node.current.votingDisabled) return [];
		return [{type: "significance", main: true}];
	}
	if (node.type == MapNodeType.Package) {
		return [{type: "significance", main: true}];
	}
	if (node.type == MapNodeType.MultiChoiceQuestion) {
		return [{type: "significance", main: true}];
	}
	if (node.type == MapNodeType.Claim) {
		let result: RatingTypeInfo[];
		// result = [{type: "truth", main: true}]; //, {type: "significance", main: true}];
		result = [{type: "truth", main: true}]; // , {type: "relevance", main: true}];
		/* if ((node as MapNodeL2).link && (node as MapNodeL2).link.form == ClaimForm.YesNoQuestion) {
			result.Remove(result.First(a=>a.type == "significance"));
			result.Insert(0, {type: "significance", main: true});
		} */
		return result;
	}
	if (node.type == MapNodeType.Argument) {
		// return [{type: "strength", main: true}, {type: "impact", main: true}];
		return [{type: "relevance"}, {type: "impact", main: true}];
	}
	Assert(false);
}
export const GetMainRatingType = StoreAccessor(s=>(node: MapNodeL2)=>{
	return GetRatingTypesForNode(node).FirstOrX(a=>a.main, {}).type;
});
export function GetSortByRatingType(node: MapNodeL3): RatingType {
	if ((node as MapNodeL3).link && (node as MapNodeL3).link.form == ClaimForm.YesNoQuestion) {
		return "significance";
	}
	return GetMainRatingType(node);
}

export function ReversePolarity(polarity: Polarity) {
	return polarity == Polarity.Supporting ? Polarity.Opposing : Polarity.Supporting;
}
export const GetFinalPolarityAtPath = StoreAccessor(s=>(node: MapNodeL2, path: string): Polarity=>{
	Assert(node.type == MapNodeType.Argument, "Only argument nodes have polarity.");
	const parent = GetParentNodeL2(path);
	if (!parent) return Polarity.Supporting; // can be null, if for NodeUI_ForBots

	const link = GetLinkUnderParent(node._key, parent);
	if (link == null) return Polarity.Supporting; // can be null, if path is invalid (eg. copied-node path)
	Assert(link.polarity != null, `The link for the argument #${node._key} must specify the polarity.`);

	const parentForm = GetNodeForm(parent, SplitStringBySlash_Cached(path).slice(0, -1).join("/"));
	return GetFinalPolarity(link.polarity, parentForm);
});
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
	const result = {...node};
	delete result.current;
	delete result["finalPolarity"];
	delete result["link"];
	return result as MapNode;
}

export function IsNodeL2(node: MapNode): node is MapNodeL2 {
	return node["current"];
}
export function AsNodeL2(node: MapNode, currentRevision: MapNodeRevision) {
	// Assert(currentRevision.titles, "A MapNodeRevision object must have a titles property!"); // temp removed (for db-upgrade)
	const result = E(node, {current: currentRevision}) as MapNodeL2;
	delete result["finalPolarity"];
	delete result["link"];
	return result;
}
export const GetNodeL2 = StoreAccessor(s=>(nodeID: string | MapNode, path?: string)=>{
	if (IsString(nodeID)) nodeID = GetNode(nodeID);
	if (nodeID == null) return null;
	const node = nodeID as MapNode;

	// if any of the data in a MapNodeL2 is not loaded yet, just return null (we want it to be all or nothing)
	const currentRevision = GetNodeRevision(node.currentRevision);
	if (currentRevision == null) return null;

	const nodeL2 = AsNodeL2(node, currentRevision);
	return CachedTransform("GetNodeL2", [path], nodeL2, ()=>nodeL2);
});

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
	return E(node, {finalPolarity, link}) as MapNodeL3;
}
export const GetNodeL3 = StoreAccessor(s=>(path: string)=>{
	if (path == null) return null;
	const nodeID = GetNodeID(path);
	const node = GetNodeL2(nodeID);
	if (node == null) return null;

	// if any of the data in a MapNodeL3 is not loaded yet, just return null (we want it to be all or nothing)
	let finalPolarity = null;
	if (node.type == MapNodeType.Argument) {
		finalPolarity = GetFinalPolarityAtPath(node, path);
		if (finalPolarity == null) return null;
	}

	const isSubnode = IsNodeSubnode(node);
	if (!isSubnode) {
		const parent = GetParentNode(path);
		if (parent == null && path.Contains("/")) return null;
		var link = GetLinkUnderParent(node._key, parent);
		if (link == null && path.Contains("/")) return null;
	}

	const nodeL3 = AsNodeL3(node, finalPolarity, link);
	// return CachedTransform('GetNodeL3', [path], nodeL3, () => nodeL3);
	return nodeL3;
});

/* export function GetNodeForm(node: MapNode, path: string): ClaimForm {
	let parent = GetParentNode(path);
	return GetNodeForm(node, parent);
}
export function GetClaimFormUnderParent(node: MapNode, parent: MapNode): ClaimForm {
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ClaimForm.Base;
	return link.form;
} */
export const GetNodeForm = StoreAccessor(s=>(node: MapNodeL2 | MapNodeL3, pathOrParent?: string | MapNodeL2): ClaimForm=>{
	if ((node as MapNodeL3).link) {
		return (node as MapNodeL3).link.form;
	}

	const parent: MapNodeL2 = IsString(pathOrParent) ? GetParentNodeL2(pathOrParent as string) : pathOrParent as MapNodeL2;
	const link = GetLinkUnderParent(node._key, parent);
	if (link == null) return ClaimForm.Base;
	return link.form;
});
export const GetLinkUnderParent = StoreAccessor(s=>(nodeID: string, parent: MapNode): ChildEntry=>{
	if (parent == null) return null;
	if (parent.children == null) return null; // post-delete, parent-data might have updated before child-data
	const link = parent.children[nodeID];
	return link;
});
export function GetLinkAtPath(path: string) {
	const nodeID = GetNodeID(path);
	const parent = GetNode(GetNodeID(SlicePath(path, 1)));
	return GetLinkUnderParent(nodeID, parent);
}

export function IsNodeTitleValid_GetError(node: MapNode, title: string) {
	if (title.trim().length == 0) return "Title cannot be empty.";
	return null;
}

export function GetAllNodeRevisionTitles(nodeRevision: MapNodeRevision): string[] {
	if (nodeRevision == null || nodeRevision.titles == null) return [];
	return TitlesMap_baseKeys.map(key=>nodeRevision.titles[key]).filter(a=>a != null);
}

/** Gets the main display-text for a node. (doesn't include equation explanation, quote sources, etc.) */
export const GetNodeDisplayText = StoreAccessor(s=>(node: MapNodeL2, path?: string, form?: ClaimForm): string=>{
	form = form || GetNodeForm(node, path);
	const titles = node.current.titles || {} as TitlesMap;

	// if (path && path.split('/').length > 3) throw new Error('Test1'); // for testing node error-boundaries

	if (node.type == MapNodeType.Argument && !node.multiPremiseArgument && !titles.base) {
		// const baseClaim = GetNodeL2(node.children && node.children.VKeys().length ? node.children.VKeys()[0] : null);
		// const baseClaim = GetArgumentPremises(node)[0];
		const baseClaim = GetNodeChildrenL2(node).filter(a=>a && a.type == MapNodeType.Claim)[0];
		if (baseClaim) return GetNodeDisplayText(baseClaim);
	}
	if (node.type == MapNodeType.Claim) {
		if (node.current.equation) {
			let result = node.current.equation.text;
			if (node.current.equation.latex && !isBot) {
				// result = result.replace(/\\[^{]+/g, "").replace(/[{}]/g, "");
				const latex = PreProcessLatex(result);
				try {
					const html = katex.renderToString(latex);
					const dom = $(html).children(".katex-html");
					result = dom.text();
				} catch (ex) {
					if (ex.message.startsWith("KaTeX parse error: ")) {
						return ex.message.replace(/^KaTeX/, "LaTeX");
					}
				}
			}
			return result;
		}
		if (node.current.quote) {
			const firstSource = node.current.quote.sourceChains[0].sources[0];
			// if (PROD && firstSource == null) return '(first source is null)'; // defensive
			return `The statement below was made${ // (as shown)
				firstSource.name ? ` in "${firstSource.name}"` : ""}${
					firstSource.author ? ` by ${firstSource.author}` : ""}${
						firstSource.link ? ` at "${VURL.Parse(firstSource.link, false).toString({domain_protocol: false})}"` : "" // maybe temp
			}.`;
		}
		if (node.current.image) {
			const image = GetImage(node.current.image.id);
			if (image == null) return "...";
			// if (image.sourceChains == null) return `The ${GetNiceNameForImageType(image.type)} below is unmodified.`; // temp
			const firstSource = node.current.quote.sourceChains[0].sources[0];
			return `The ${GetNiceNameForImageType(image.type)} below was published${ // (as shown)`
				firstSource.name ? ` in "${firstSource.name}"` : ""}${
					firstSource.author ? ` by ${firstSource.author}` : ""}${
						firstSource.link ? ` at "${VURL.Parse(firstSource.link, false).toString({domain_protocol: false})}"` : "" // maybe temp
			}.`;
		}

		if (form) {
			if (form == ClaimForm.Negation) return titles.negation || missingTitleStrings[1];
			if (form == ClaimForm.YesNoQuestion) return titles.yesNoQuestion || missingTitleStrings[2];
		}
	}
	return titles.base || missingTitleStrings[0];
});
export const missingTitleStrings = ["(base title not set)", "(negation title not set)", "(yes-no-question title not set)"];

export function GetValidChildTypes(nodeType: MapNodeType, path: string) {
	const nodeTypes = GetValues<MapNodeType>(MapNodeType);
	const validChildTypes = nodeTypes.filter(type=>ForLink_GetError(nodeType, type) == null);
	return validChildTypes;
}
export function GetValidNewChildTypes(parent: MapNodeL2, holderType: HolderType, permissions: PermissionGroupSet) {
	const nodeTypes = GetValues<MapNodeType>(MapNodeType);
	const validChildTypes = nodeTypes.filter(type=>ForNewLink_GetError(parent._key, {type} as any, permissions, holderType) == null);
	return validChildTypes;
}

/** Returns whether the node provided is an argument, and marked as single-premise. */
export const IsSinglePremiseArgument = StoreAccessor(s=>(node: MapNode)=>{
	/* nodeChildren = nodeChildren || GetNodeChildren(node);
	if (nodeChildren.Any(a=>a == null)) return null;
	//return nodeChildren.Any(child=>IsPremiseOfSinglePremiseArgument(child, node));
	return node.type == MapNodeType.Argument && nodeChildren.filter(a=>a.type == MapNodeType.Claim).length == 1; */
	return node && node.type == MapNodeType.Argument && !node.multiPremiseArgument;
});
/** Returns whether the node provided is an argument, and marked as multi-premise. */
export const IsMultiPremiseArgument = StoreAccessor(s=>(node: MapNode)=>{
	/* nodeChildren = nodeChildren || GetNodeChildren(node);
	if (nodeChildren.Any(a=>a == null)) return null;
	//return node.type == MapNodeType.Argument && !IsSinglePremiseArgument(node, nodeChildren);
	return node.type == MapNodeType.Argument && nodeChildren.filter(a=>a.type == MapNodeType.Claim).length > 1; */
	return node && node.type == MapNodeType.Argument && node.multiPremiseArgument;
});

export const IsPremiseOfSinglePremiseArgument = StoreAccessor(s=>(node: MapNode, parent: MapNode)=>{
	if (parent == null) return null;
	// let parentChildren = GetNodeChildrenL2(parent);
	/* if (parentChildren.Any(a=>a == null)) return false;
	return node.type == MapNodeType.Claim && parentChildren.filter(a=>a.type == MapNodeType.Claim).length == 1 && node.link.form != ClaimForm.YesNoQuestion; */
	return node.type == MapNodeType.Claim && IsSinglePremiseArgument(parent);
});
export function IsPremiseOfMultiPremiseArgument(node: MapNode, parent: MapNode) {
	if (parent == null) return null;
	// let parentChildren = GetNodeChildrenL2(parent);
	return node.type == MapNodeType.Claim && IsMultiPremiseArgument(parent);
}
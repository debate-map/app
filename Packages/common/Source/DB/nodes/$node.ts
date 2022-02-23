import {Assert, CachedTransform, GetValues, IsString, VURL, E, Clone, CE, A} from "web-vcore/nm/js-vextensions.js";
import {SplitStringBySlash_Cached, SlicePath, CreateAccessor, PartialBy, BailIfNull} from "web-vcore/nm/mobx-graphlink.js";
import Moment from "web-vcore/nm/moment";
import {GetMedia} from "../media.js";
import {GetNiceNameForMediaType, MediaType} from "../media/@Media.js";
import {NodeRatingType} from "../nodeRatings/@NodeRatingType.js";
import {GetNodeRevision, GetNodeRevisions} from "../nodeRevisions.js";
import {ForLink_GetError, ForNewLink_GetError, GetNode, GetNodeChildrenL2, GetNodeID, GetParentNode, GetParentNodeL2, GetNodeChildrenL3} from "../nodes.js";
import {ClaimForm, MapNode, MapNodeL2, MapNodeL3, Polarity} from "./@MapNode.js";
import {MapNodeRevision} from "./@MapNodeRevision.js";
import {ChildGroup, MapNodeType} from "./@MapNodeType.js";
import {PermissionGroupSet} from "../users/@User.js";
import {GetNodeTags, GetNodeTagComps, GetFinalTagCompsForTag} from "../nodeTags.js";
import {TagComp_MirrorChildrenFromXToY} from "../nodeTags/@MapNodeTag.js";
import {SourceType, Source} from "../@Shared/Attachments/@SourceChain.js";
import {GetNodeChildLinks} from "../nodeChildLinks.js";
import {NodeChildLink} from "../nodeChildLinks/@NodeChildLink.js";
import {GetAccessPolicy, PermitCriteriaPermitsNoOne} from "../accessPolicies.js";
import {AccessPolicy} from "../accessPolicies/@AccessPolicy.js";
import {MapNodePhrasing_Embedded, TitleKey_values} from "../nodePhrasings/@MapNodePhrasing.js";

export function PreProcessLatex(text: string) {
	// text = text.replace(/\\term{/g, "\\text{");
	// "\term{some-term}{123}" -> "\text{@term[some-term,123]}
	//text = text.replace(/\\term{(.+?)}{([A-Za-z0-9_-]+?)}/g, (m, g1, g2)=>`\\text{@term[${g1},${g2}]}`);

	// "\term{some-term}" -> "\text{@term[some-term]}
	text = text.replace(/\\term{(.+?)}/g, (m, g1, g2)=>`\\text{@term[${g1}]}`);

	text = text.replace(/\\term/g, ()=>"[syntax wrong]"); // for user syntax mistakes, keep from causing error
	return text;
}

export function GetFontSizeForNode(node: MapNodeL2/*, isSubnode = false*/) {
	if (node.current.displayDetails?.fontSizeOverride) return node.current.displayDetails?.fontSizeOverride;
	if (node.current.equation) return node.current.equation.latex ? 14 : 13;
	//if (isSubnode) return 11;
	return 14;
}
export function GetPaddingForNode(node: MapNodeL2/*, isSubnode = false*/) {
	//return isSubnode ? "1px 4px 2px" : "5px 5px 4px";
	return "5px 5px 4px";
}
export type RatingTypeInfo = {type: NodeRatingType, main?: boolean, collapsed?: boolean};
export function GetRatingTypesForNode(node: MapNodeL2): RatingTypeInfo[] {
	if (node.type == MapNodeType.category) {
		if (PermitCriteriaPermitsNoOne(node.policy.permissions.nodes.vote)) return [];
		return [{type: NodeRatingType.significance, main: true}];
	}
	if (node.type == MapNodeType.package) {
		return [{type: NodeRatingType.significance, main: true}];
	}
	if (node.type == MapNodeType.multiChoiceQuestion) {
		return [{type: NodeRatingType.significance, main: true}];
	}
	if (node.type == MapNodeType.claim) {
		let result: RatingTypeInfo[];
		// result = [{type: "truth", main: true}]; //, {type: "significance", main: true}];
		result = [{type: NodeRatingType.truth, main: true}]; // , {type: "relevance", main: true}];
		/* if ((node as MapNodeL2).link && (node as MapNodeL2).link.form == ClaimForm.YesNoQuestion) {
			result.Remove(result.First(a=>a.type == "significance"));
			result.Insert(0, {type: "significance", main: true});
		} */
		return result;
	}
	if (node.type == MapNodeType.argument) {
		// return [{type: "strength", main: true}, {type: "impact", main: true}];
		return [{type: NodeRatingType.relevance}, {type: NodeRatingType.impact, main: true}];
	}
	Assert(false);
}
export const GetMainRatingType = CreateAccessor((node: MapNodeL2)=>{
	return GetRatingTypesForNode(node).FirstOrX(a=>!!a.main, {} as Partial<RatingTypeInfo>)!.type;
});
export function GetSortByRatingType(node: MapNodeL3): NodeRatingType|n {
	if (node.link && node.link.form == ClaimForm.question) {
		return NodeRatingType.significance;
	}
	return GetMainRatingType(node);
}

export function ReversePolarity(polarity: Polarity) {
	return polarity == Polarity.supporting ? Polarity.opposing : Polarity.supporting;
}
export const GetDisplayPolarityAtPath = CreateAccessor((node: MapNodeL2, path: string, tagsToIgnore?: string[]): Polarity=>{
	Assert(node.type == MapNodeType.argument, "Only argument nodes have polarity.");
	const parent = GetParentNodeL2(path);
	if (!parent) return Polarity.supporting; // can be null, if for NodeUI_ForBots

	const link = GetLinkUnderParent(node.id, parent, true, tagsToIgnore);
	if (link == null) return Polarity.supporting; // can be null, if path is invalid (eg. copied-node path)
	Assert(link.polarity != null, `The link for the argument #${node.id} (from parent #${parent.id}) must specify the polarity.`);

	const parentForm = GetNodeForm(parent, SplitStringBySlash_Cached(path).slice(0, -1).join("/"));
	return GetDisplayPolarity(link.polarity, parentForm);
});
export function GetDisplayPolarity(basePolarity: Polarity, parentForm: ClaimForm): Polarity {
	let result = basePolarity;
	if (parentForm == ClaimForm.negation) {
		result = ReversePolarity(result);
	}
	return result;
}
export function IsNodeL1(node): node is MapNode {
	return !node["current"];
}
export function AsNodeL1(node: MapNodeL2 | MapNodeL3) {
	const result = E(node) as any;
	delete result.policy;
	delete result.current;
	delete result.displayPolarity;
	delete result.link;
	return result as MapNode;
}

export function IsNodeL2(node: MapNode): node is MapNodeL2 {
	return node["current"];
}
export function AsNodeL2(node: MapNode, currentRevision: MapNodeRevision, accessPolicy: AccessPolicy) {
	Assert(currentRevision, "Empty node-revision sent to AsNodeL2!");
	Assert(accessPolicy, "Empty access-policy sent to AsNodeL2!");

	// Assert(currentRevision.titles, "A MapNodeRevision object must have a titles property!"); // temp removed (for db-upgrade)
	const result = E(node, {
		policy: accessPolicy,
		current: currentRevision,
	}) as MapNodeL2;
	delete result["displayPolarity"];
	delete result["link"];
	return result;
}
export const GetNodeL2 = CreateAccessor((nodeID: string | MapNode | n, path?: string)=>{
	if (IsString(nodeID)) nodeID = GetNode(nodeID) as MapNode;
	if (nodeID == null) return null;
	const node = nodeID as MapNode;

	// if any of the data in a MapNodeL2 is not loaded yet, just return null (we want it to be all or nothing)
	//const currentRevision = GetNodeRevision(node.currentRevision);
	//const currentRevision = GetCurrentRevision(node.id, path, mapID);
	const currentRevision = GetNodeRevision(node.c_currentRevision);
	BailIfNull(currentRevision); // BIN: db should make-sure at least 1 revision exists, so if none, change must be loading

	const accessPolicy = GetAccessPolicy.BIN(node.accessPolicy); // BIN: access-policy is db-certain to exist, so if null, change must be loading

	const nodeL2 = AsNodeL2(node, currentRevision!, accessPolicy);
	//return CachedTransform("GetNodeL2", [path], nodeL2, ()=>nodeL2);
	return nodeL2;
});

export function IsNodeL3(node: MapNode): node is MapNodeL3 {
	//return node["displayPolarity"] && node["link"];
	//if (node.type == MapNodeType.category) {

	// merely check for prop existence (values can be null, yet valid)
	return "displayPolarity" in node && "link" in node;

	/*}
	// check for both existence and non-nullness (values must be non-null to be valid)
	return node["displayPolarity"] != null && node["link"] != null;*/
}
/*export function AsNodeL3(node: MapNodeL2, displayPolarity?: Polarity, link?: NodeChildLink) {
	Assert(IsNodeL2(node), "Node sent to AsNodeL3 was not an L2 node!");
	displayPolarity = displayPolarity || Polarity.supporting;
	link = link ?? {
		form: ClaimForm.base,
		seriesAnchor: false,
		polarity: Polarity.supporting,
	};
	return E(node, {displayPolarity, link}) as MapNodeL3;
}*/
export function AsNodeL3(node: MapNodeL2, link: PartialBy<NodeChildLink, "polarity">|n, displayPolarity: Polarity|n = Polarity.supporting) {
	Assert(IsNodeL2(node), "Node sent to AsNodeL3 was not an L2 node!");
	return E(node, {displayPolarity, link}) as MapNodeL3;
}
export const GetNodeL3 = CreateAccessor((path: string | n, tagsToIgnore?: string[])=>{
	if (path == null) return null;
	const nodeID = GetNodeID(path);
	const node = GetNodeL2(nodeID);
	if (node == null) return null;

	// if any of the data in a MapNodeL3 is not loaded yet, just bail (we want it to be all or nothing)
	const displayPolarity = node.type == MapNodeType.argument ? GetDisplayPolarityAtPath.BIN(node, path, tagsToIgnore) : null;

	/*const isSubnode = IsNodeSubnode(node);
	if (!isSubnode) {*/
	const parent = GetParentNode(path);
	if (parent == null && path.includes("/")) return null;
	var link = GetLinkUnderParent(node.id, parent, true, tagsToIgnore);
	if (link == null && path.includes("/")) return null;
	//}

	const nodeL3 = AsNodeL3(node, link, displayPolarity);
	// return CachedTransform('GetNodeL3', [path], nodeL3, () => nodeL3);
	return nodeL3;
});

/*export function GetNodeForm(node: MapNode, path: string): ClaimForm {
	let parent = GetParentNode(path);
	return GetNodeForm(node, parent);
}
export function GetClaimFormUnderParent(node: MapNode, parent: MapNode): ClaimForm {
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ClaimForm.Base;
	return link.form;
}*/
export const GetNodeForm = CreateAccessor((node: MapNode, pathOrParent?: string | MapNode): ClaimForm=>{
	if (IsNodeL3(node) && node.link) {
		return node.link.form ?? ClaimForm.base;
	}

	const parent = IsString(pathOrParent) ? GetParentNode(pathOrParent as string) : pathOrParent as MapNode;
	const link = GetLinkUnderParent(node.id, parent);
	return link?.form ?? ClaimForm.base;
});
export const GetLinkUnderParent = CreateAccessor((nodeID: string, parent: MapNode|n, includeMirrorLinks = true, tagsToIgnore?: string[])=>{
	if (parent == null) return null;
	//let link = parent.children?.[nodeID]; // null-check, since after child-delete, parent-data might have updated before child-data removed
	const parentChildLinks = GetNodeChildLinks(parent.id, nodeID);
	let link = parentChildLinks[0];
	if (includeMirrorLinks && link == null) {
		const tags = GetNodeTags(parent.id).filter(tag=>tag && !tagsToIgnore?.includes(tag.id));
		for (const tag of tags) {
			//let tagComps = GetNodeTagComps(parent.id);
			const tagComps = GetFinalTagCompsForTag(tag);
			for (const comp of tagComps) {
				if (comp instanceof TagComp_MirrorChildrenFromXToY && comp.nodeY == parent.id) {
					let mirrorChildren = GetNodeChildrenL3(comp.nodeX, undefined, undefined, (tagsToIgnore ?? []).concat(tag.id));
					mirrorChildren = mirrorChildren.filter(child=>{
						return child && ((child.link?.polarity == Polarity.supporting && comp.mirrorSupporting) || (child.link?.polarity == Polarity.opposing && comp.mirrorOpposing));
					});
					const nodeL3ForNodeAsMirrorChildInThisTag = mirrorChildren.find(a=>a.id == nodeID);
					//const nodeL3ForNodeAsMirrorChildInThisTag = GetNodeL3(`${comp.nodeX}/${nodeID}`);
					if (nodeL3ForNodeAsMirrorChildInThisTag) {
						link = Clone(nodeL3ForNodeAsMirrorChildInThisTag.link) as NodeChildLink;
						Object.defineProperty(link, "_mirrorLink", {value: true});
						if (comp.reversePolarities && link.polarity) {
							link.polarity = ReversePolarity(link.polarity);
						}
					}
				}
			}
		}
	}
	return link;
});
export function GetLinkAtPath(path: string) {
	const nodeID = GetNodeID(path)!;
	const parent = GetNode(GetNodeID(SlicePath(path, 1)));
	return GetLinkUnderParent(nodeID, parent);
}

export class NodeContributionInfo {
	constructor(nodeID: string) {
		this.proArgs = new NodeContributionInfo_ForPolarity(nodeID);
		this.conArgs = new NodeContributionInfo_ForPolarity(nodeID);
	}
	proArgs: NodeContributionInfo_ForPolarity;
	conArgs: NodeContributionInfo_ForPolarity;
}
export class NodeContributionInfo_ForPolarity {
	constructor(nodeID: string) {
		this.hostNodeID = nodeID;
	}
	canAdd = true;
	hostNodeID: string;
	reversePolarities = false;
}
export function GetPolarityShortStr(polarity: Polarity) {
	return polarity == Polarity.supporting ? "pro" : "con";
}

export const GetNodeContributionInfo = CreateAccessor((nodeID: string)=>{
	const result = new NodeContributionInfo(nodeID);
	const tags = GetNodeTags(nodeID);
	const directChildrenDisabled = CE(tags).Any(a=>a.mirrorChildrenFromXToY?.nodeY == nodeID && a.mirrorChildrenFromXToY?.disableDirectChildren);
	if (directChildrenDisabled) {
		result.proArgs.canAdd = false;
		result.conArgs.canAdd = false;
	}
	for (const tag of tags) {
		if (tag.mirrorChildrenFromXToY && tag.mirrorChildrenFromXToY.nodeY == nodeID) {
			const comp = tag.mirrorChildrenFromXToY;
			const addForPolarities_short = [] as ("pro" | "con")[];
			if (comp.mirrorSupporting) addForPolarities_short.push(comp.reversePolarities ? "con" : "pro");
			if (comp.mirrorOpposing) addForPolarities_short.push(comp.reversePolarities ? "pro" : "con");
			for (const polarity_short of addForPolarities_short) {
				result[`${polarity_short}Args`].canAdd = true;
				result[`${polarity_short}Args`].hostNodeID = comp.nodeX;
				result[`${polarity_short}Args`].reversePolarities = comp.reversePolarities;
			}
		}
	}
	/*if (!CanContributeToNode(userID, result.proArgs.hostNodeID)) result.proArgs.canAdd = false;
	if (!CanContributeToNode(userID, result.conArgs.hostNodeID)) result.conArgs.canAdd = false;*/
	return result;
});

export function IsNodeTitleValid_GetError(node: MapNode, title: string) {
	if (title.trim().length == 0) return "Title cannot be empty.";
	return null;
}

export function GetAllNodeRevisionTitles(nodeRevision: MapNodeRevision): string[] {
	if (nodeRevision == null || nodeRevision.phrasing == null) return [];
	return TitleKey_values.map(key=>nodeRevision.phrasing[key]).filter(a=>a != null) as string[];
}

export const missingTitleStrings = ["(base title not set)", "(negation title not set)", "(question title not set)"];
/** Gets the main display-text for a node. (doesn't include equation explanation, quote sources, etc.) */
export const GetNodeDisplayText = CreateAccessor((node: MapNodeL2, path?: string, form?: ClaimForm): string=>{
	form = form || GetNodeForm(node, path);
	const phrasing = node.current.phrasing || {} as MapNodePhrasing_Embedded;

	const [simpleTitle, simpleTitleFallback] = ((): [string | undefined, string]=>{
		if (form) {
			if (form == ClaimForm.negation) return [phrasing.text_negation, missingTitleStrings[1]];
			if (form == ClaimForm.question) {
				//return phrasing.text_question || missingTitleStrings[2];
				// for now at least, allow fallback to the base title
				return [phrasing.text_question || phrasing.text_base, missingTitleStrings[2]];
			}
		}
		return [phrasing.text_base, missingTitleStrings[0]];
	})();

	// if (path && path.split('/').length > 3) throw new Error('Test1'); // for testing node error-boundaries

	if (node.type == MapNodeType.argument && !node.multiPremiseArgument && !phrasing.text_base) {
		// const baseClaim = GetNodeL2(node.children && node.children.VKeys().length ? node.children.VKeys()[0] : null);
		// const baseClaim = GetArgumentPremises(node)[0];
		const baseClaim = GetNodeChildrenL2(node.id).filter(a=>a && a.type == MapNodeType.claim)[0];
		if (baseClaim) return GetNodeDisplayText(baseClaim);
	}
	if (node.type == MapNodeType.claim) {
		if (node.current.equation) {
			let result = node.current.equation.text;
			//if (node.current.equation.latex && !isBot) {
			if (node.current.equation.latex && typeof window != "undefined" && window["katex"] && window["$"]) {
				// result = result.replace(/\\[^{]+/g, "").replace(/[{}]/g, "");
				const latex = PreProcessLatex(result);
				try {
					const html = window["katex"].renderToString(latex) as string;
					const dom = window["$"](html).children(".katex-html");
					result = dom.text();
				} catch (ex) {
					if (ex.message.startsWith("KaTeX parse error: ")) {
						return ex.message.replace(/^KaTeX/, "LaTeX");
					}
				}
			}
			return result;
		}

		// for now, only use the "statements below were made" title if there is no simple-title set (needed for SL use-case)
		// (in the future, I will probably make-so this can only be done in private maps or something, as it's contrary to the "keep components separate/debatable" concept)
		if ((node.current.quote || node.current.media) && (simpleTitle?.trim() ?? "").length == 0) {
			let text: string;
			let firstSource: Source;
			if (node.current.quote) {
				text = `The statements below were made`;
				firstSource = node.current.quote.sourceChains[0].sources[0];

				if (firstSource.name) text += ` as part of ${firstSource.name}`;
			} else if (node.current.media) {
				const media = GetMedia(node.current.media.id);
				if (media == null) return "...";
				// if (image.sourceChains == null) return `The ${GetNiceNameForImageType(image.type)} below is unmodified.`; // temp
				text = `The ${GetNiceNameForMediaType(media.type)} below`;
				firstSource = node.current.media.sourceChains[0].sources[0];

				if (firstSource.name) text += `, as part of ${firstSource.name},`;
				text += ` was ${node.current.media.captured ? "captured" : "produced"}`;
			} else {
				throw "[can't happen]";
			}

			if (firstSource.location) text += ` at ${firstSource.location}`;
			if (firstSource.author) text += ` by ${firstSource.author}`;

			function TimeToStr(time: number) {
				//return Moment(time).format("YYYY-MM-DD HH:mm:ss");
				return Moment(time).format("YYYY-MM-DD HH:mm");
			}
			if (firstSource.time_min != null && firstSource.time_max == null) text += `, after ${TimeToStr(firstSource.time_min)}`;
			if (firstSource.time_min == null && firstSource.time_max != null) text += `, before ${TimeToStr(firstSource.time_max)}`;
			if (firstSource.time_min != null && firstSource.time_max != null) {
				if (firstSource.time_min == firstSource.time_max) text += `, at ${TimeToStr(firstSource.time_min)}`;
				else text += `, between ${TimeToStr(firstSource.time_min)} and ${TimeToStr(firstSource.time_max)}`;
			}

			if (firstSource.link) text += ` at ${VURL.Parse(firstSource.link, false).toString({domain_protocol: false})}`; // maybe temp
			return text;
		}
	}

	return simpleTitle || simpleTitleFallback;
});

export function GetValidChildTypes(nodeType: MapNodeType, path: string, group: ChildGroup) {
	const nodeTypes = GetValues(MapNodeType);
	const validChildTypes = nodeTypes.filter(type=>ForLink_GetError(nodeType, type, group) == null);
	return validChildTypes;
}
export function GetValidNewChildTypes(parent: MapNodeL2, childGroup: ChildGroup, permissions: PermissionGroupSet) {
	const nodeTypes = GetValues(MapNodeType);
	const validChildTypes = nodeTypes.filter(type=>ForNewLink_GetError(parent.id, {type} as any, permissions, childGroup) == null);

	// if in relevance or truth group, claims cannot be direct children (must be within argument)
	/*if (childGroup == ChildGroup.relevance || childGroup == ChildGroup.truth) {
		validChildTypes = validChildTypes.Exclude(MapNodeType.claim);
	} else {
		// in the other cases, arguments cannot be direct children (those are only meant for in relevance/truth groups)
		validChildTypes = validChildTypes.Exclude(MapNodeType.argument);
	}*/

	return validChildTypes;
}

/** Returns whether the node provided is an argument, and marked as single-premise. */
export const IsSinglePremiseArgument = CreateAccessor((node: MapNode|n)=>{
	if (node == null) return false;
	return node.type == MapNodeType.argument && !node.multiPremiseArgument;
});
/** Returns whether the node provided is an argument, and marked as multi-premise. */
export const IsMultiPremiseArgument = CreateAccessor((node: MapNode|n)=>{
	if (node == null) return false;
	return node.type == MapNodeType.argument && node.multiPremiseArgument;
});

/*export function IsPrivateNode(node: MapNode) {
	return node.ownerMapID != null;
}
export function IsPublicNode(node: MapNode) {
	return node.ownerMapID == null;
}*/

export const IsPremiseOfSinglePremiseArgument = CreateAccessor((node: MapNode, parent: MapNode|n)=>{
	if (parent == null) return false;
	return node.type == MapNodeType.claim && IsSinglePremiseArgument(parent);
});
export const IsPremiseOfMultiPremiseArgument = CreateAccessor((node: MapNode, parent: MapNode|n)=>{
	if (parent == null) return false;
	return node.type == MapNodeType.claim && IsMultiPremiseArgument(parent);
});

export function GetArgumentNode(node: MapNode, parent: MapNode|n) {
	const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
	const argumentNode =
		node.type == MapNodeType.argument ? node :
		isPremiseOfSinglePremiseArg ? parent :
		null;
	return argumentNode;
}
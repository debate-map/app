import {Assert, CachedTransform, GetValues, IsString, VURL, E, Clone, CE, A, AssertWarn} from "js-vextensions";
import {SplitStringBySlash_Cached, SlicePath, CreateAccessor, PartialBy, BailIfNull} from "mobx-graphlink";
import Moment from "moment";
import {AssertUnreachable} from "web-vcore";
import {GetMedia} from "../media.js";
import {GetNiceNameForMediaType, MediaType} from "../media/@Media.js";
import {DMap} from "../maps/@Map.js";
import {NodeRatingType} from "../nodeRatings/@NodeRatingType.js";
import {GetNodeRevision, GetNodeRevisions} from "../nodeRevisions.js";
import {GetNode, GetNodeChildrenL2, GetNodeID, GetParentNode, GetParentNodeL2, GetNodeChildrenL3, GetParentNodeL3} from "../nodes.js";
import {NodeL1, NodeL2, NodeL3} from "./@Node.js";
import {ChildLayout, GetChildLayout_Final, NodeRevision} from "./@NodeRevision.js";
import {NodeType} from "./@NodeType.js";
import {PermissionGroupSet, User} from "../users/@User.js";
import {GetNodeTags, GetNodeTagComps, GetFinalTagCompsForTag} from "../nodeTags.js";
import {TagComp_MirrorChildrenFromXToY} from "../nodeTags/@NodeTag.js";
import {SourceType, Source} from "../@Shared/Attachments/@SourceChain.js";
import {GetNodeLinks} from "../nodeLinks.js";
import {ChildGroup, ClaimForm, NodeLink, Polarity} from "../nodeLinks/@NodeLink.js";
import {GetAccessPolicy, PermitCriteriaPermitsNoOne} from "../accessPolicies.js";
import {AccessPolicy} from "../accessPolicies/@AccessPolicy.js";
import {NodePhrasing_Embedded, TitleKey, TitleKey_values} from "../nodePhrasings/@NodePhrasing.js";
import {Attachment} from "../@Shared/Attachments/@Attachment.js";
import {SLMode_ForJSCommon, GetExtractedPrefixTextInfo, ShouldExtractPrefixText, ShowHeader_ForJSCommon} from "./$node/$node_sl.js";
import {IsNodeToolbarEnabled, ShowNodeToolbar} from "../maps/$map.js";

export function PreProcessLatex(text: string) {
	// text = text.replace(/\\term{/g, "\\text{");
	// "\term{some-term}{123}" -> "\text{@term[some-term,123]}
	//text = text.replace(/\\term{(.+?)}{([A-Za-z0-9_-]+?)}/g, (m, g1, g2)=>`\\text{@term[${g1},${g2}]}`);

	// "\term{some-term}" -> "\text{@term[some-term]}
	text = text.replace(/\\term{(.+?)}/g, (m, g1, g2)=>`\\text{@term[${g1}]}`);

	text = text.replace(/\\term/g, ()=>"[syntax wrong]"); // for user syntax mistakes, keep from causing error
	return text;
}

export const GetTitleIntegratedAttachment = CreateAccessor((rev: NodeRevision)=>{
	if (rev == null) return null; // seems not needed?
	return rev.attachments.find(a=>a.equation);
});
export const GetSubPanelAttachments = CreateAccessor((rev: NodeRevision)=>{
	return rev.attachments.filter(a=>a.equation == null);
});
/** Note: "Expanded by default" is something specific to sub-panel attachments. */
export const GetExpandedByDefaultAttachment = CreateAccessor((rev: NodeRevision)=>{
	if (rev == null) return null; // seems not needed?
	return rev.attachments.find(a=>a.expandedByDefault);
});

export function GetFontSizeForNode(node: NodeL2, path: string) {
	if (node.current.displayDetails?.fontSizeOverride) return node.current.displayDetails?.fontSizeOverride;
	const titleAttachment = GetTitleIntegratedAttachment(node.current);
	if (titleAttachment?.equation) return titleAttachment.equation.latex ? 14 : 13;
	if (node.type == NodeType.argument) {
		const {rawTitle} = GetNodeRawTitleAndSuch(node, path);
		const useStandardTitle = UseStandardArgTitleOverCustom(rawTitle);
		// if using standard-title, make text smaller (since it's easy to read/understand, and repetitive)
		if (useStandardTitle) return 11;
	}

	return 14;
}
export function GetPaddingForNode(node: NodeL2/*, isSubnode = false*/) {
	//return isSubnode ? "1px 4px 2px" : "5px 5px 4px";
	return "5px 5px 4px";
}
export type RatingTypeInfo = {type: NodeRatingType, main?: boolean, collapsed?: boolean};
export function GetRatingTypesForNode(node: NodeL2): RatingTypeInfo[] {
	if (node.type == NodeType.category) {
		if (PermitCriteriaPermitsNoOne(node.policy.permissions.nodes.vote)) return [];
		return [{type: NodeRatingType.significance, main: true}];
	}
	if (node.type == NodeType.package) {
		return [{type: NodeRatingType.significance, main: true}];
	}
	if (node.type == NodeType.multiChoiceQuestion) {
		return [{type: NodeRatingType.significance, main: true}];
	}
	if (node.type == NodeType.claim) {
		let result: RatingTypeInfo[];
		// result = [{type: "truth", main: true}]; //, {type: "significance", main: true}];
		result = [{type: NodeRatingType.truth, main: true}]; // , {type: "relevance", main: true}];
		/* if ((node as NodeL2).link && (node as NodeL2).link.form == ClaimForm.YesNoQuestion) {
			result.Remove(result.First(a=>a.type == "significance"));
			result.Insert(0, {type: "significance", main: true});
		} */
		return result;
	}
	if (node.type == NodeType.argument) {
		// return [{type: "strength", main: true}, {type: "impact", main: true}];
		return [{type: NodeRatingType.relevance}, {type: NodeRatingType.impact, main: true}];
	}
	if (node.type == NodeType.comment) {
		return [];
	}
	AssertUnreachable(node.type);
}
export const GetMainRatingType = CreateAccessor((node: NodeL2)=>{
	return GetRatingTypesForNode(node).FirstOrX(a=>!!a.main, {} as Partial<RatingTypeInfo>)!.type;
});
export function GetSortByRatingType(node: NodeL3): NodeRatingType|n {
	if (node.link && node.link.form == ClaimForm.question) {
		return NodeRatingType.significance;
	}
	return GetMainRatingType(node);
}

export function ReversePolarity(polarity: Polarity) {
	return polarity == Polarity.supporting ? Polarity.opposing : Polarity.supporting;
}
/** If returns `Polarity.supporting`, then `node` supports the display form of its parent and shows as green; if returns `Polarity.opposing`, it opposes that displayed form and shows as red. */
export const GetDisplayPolarityAtPath = CreateAccessor((node: NodeL2, path: string, tagsToIgnore?: string[]): Polarity|null=>{
	//Assert(node.type == NodeType.argument, "Only argument nodes have polarity.");
	const resultIfDataMissing = node.type == NodeType.argument ? Polarity.supporting : null;

	const parent = GetParentNodeL2(path);
	if (!parent) return resultIfDataMissing; // can be null, eg. for NodeUI_ForBots

	const link = GetLinkUnderParent(node.id, parent, true, tagsToIgnore);
	if (link == null) return resultIfDataMissing; // can be null, if path is invalid (eg. copied-node path)
	if (link.polarity != null) {
		AssertWarn(node.type.IsOneOf(NodeType.argument, NodeType.claim), `The link for the node #${node.id} (from parent #${parent.id}) must not specify the polarity. (node is not an argument or claim)`);
	} else {
		AssertWarn(node.type != NodeType.argument, `The link for the argument #${node.id} (from parent #${parent.id}) must specify the polarity.`);
		return resultIfDataMissing;
	}

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
/** If returns true, then node's form is `ClaimForm.negation`, thus its ratings need reversing in the UI. */
export function ShouldRatingTypeBeReversed(node: NodeL3, ratingType: NodeRatingType) {
	// return node.type == NodeType.Argument && node.finalPolarity != node.link.polarity;
	// if (["impact", "relevance"].Contains(ratingType)) return false;
	return node.link?.form == ClaimForm.negation;
}

export function IsNodeL1(node): node is NodeL1 {
	return !node["current"];
}
export function AsNodeL1(node: NodeL2 | NodeL3) {
	const result = E(node) as any;
	delete result.policy;
	delete result.current;
	delete result.displayPolarity;
	delete result.link;
	return result as NodeL1;
}

export function IsNodeL2(node: NodeL1): node is NodeL2 {
	return node["current"];
}
export function AsNodeL2(node: NodeL1, currentRevision: NodeRevision, accessPolicy: AccessPolicy) {
	Assert(currentRevision, "Empty node-revision sent to AsNodeL2!");
	Assert(accessPolicy, "Empty access-policy sent to AsNodeL2!");

	// Assert(currentRevision.titles, "A NodeRevision object must have a titles property!"); // temp removed (for db-upgrade)
	const result = E(node, {
		policy: accessPolicy,
		current: currentRevision,
	}) as NodeL2;
	delete result["displayPolarity"];
	delete result["link"];
	return result;
}
export const GetNodeL2 = CreateAccessor((nodeID: string | NodeL1 | n, path?: string)=>{
	if (IsString(nodeID)) nodeID = GetNode(nodeID) as NodeL1;
	if (nodeID == null) return null;
	const node = nodeID as NodeL1;

	// if any of the data in a NodeL2 is not loaded yet, just return null (we want it to be all or nothing)
	//const currentRevision = GetNodeRevision(node.currentRevision);
	//const currentRevision = GetCurrentRevision(node.id, path, mapID);
	const currentRevision = GetNodeRevision(node.c_currentRevision);
	BailIfNull(currentRevision); // BIN: db should make-sure at least 1 revision exists, so if none, change must be loading

	const accessPolicy = GetAccessPolicy.BIN(node.accessPolicy); // BIN: access-policy is db-certain to exist, so if null, change must be loading

	const nodeL2 = AsNodeL2(node, currentRevision!, accessPolicy);
	//return CachedTransform("GetNodeL2", [path], nodeL2, ()=>nodeL2);
	return nodeL2;
});

export function IsNodeL3(node: NodeL1): node is NodeL3 {
	//return node["displayPolarity"] && node["link"];
	//if (node.type == NodeType.category) {

	// merely check for prop existence (values can be null, yet valid)
	return "displayPolarity" in node && "link" in node;

	/*}
	// check for both existence and non-nullness (values must be non-null to be valid)
	return node["displayPolarity"] != null && node["link"] != null;*/
}
/*export function AsNodeL3(node: NodeL2, displayPolarity?: Polarity, link?: NodeLink) {
	Assert(IsNodeL2(node), "Node sent to AsNodeL3 was not an L2 node!");
	displayPolarity = displayPolarity || Polarity.supporting;
	link = link ?? {
		form: ClaimForm.base,
		seriesAnchor: false,
		polarity: Polarity.supporting,
	};
	return E(node, {displayPolarity, link}) as NodeL3;
}*/
export function AsNodeL3(node: NodeL2, link: PartialBy<NodeLink, "polarity">|n, displayPolarity: Polarity|n = Polarity.supporting) {
	Assert(IsNodeL2(node), "Node sent to AsNodeL3 was not an L2 node!");
	return E(node, {displayPolarity, link}) as NodeL3;
}
export const GetNodeL3 = CreateAccessor((path: string | n, tagsToIgnore?: string[])=>{
	if (path == null) return null;
	const nodeID = GetNodeID(path);
	const node = GetNodeL2(nodeID);
	if (node == null) return null;

	const displayPolarity = GetDisplayPolarityAtPath(node, path, tagsToIgnore);

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

/*export function GetNodeForm(node: NodeL1, path: string): ClaimForm {
	let parent = GetParentNode(path);
	return GetNodeForm(node, parent);
}
export function GetClaimFormUnderParent(node: NodeL1, parent: NodeL1): ClaimForm {
	let link = GetLinkUnderParent(node._id, parent);
	if (link == null) return ClaimForm.Base;
	return link.form;
}*/
export const GetNodeForm = CreateAccessor((node: NodeL1, pathOrParent?: string | NodeL1 | n): ClaimForm=>{
	if (IsNodeL3(node) && node.link) {
		return node.link.form ?? ClaimForm.base;
	}

	const parent = IsString(pathOrParent) ? GetParentNode(pathOrParent as string) : pathOrParent as NodeL1;
	const link = GetLinkUnderParent(node.id, parent);
	return link?.form ?? ClaimForm.base;
});
export const GetLinkUnderParent = CreateAccessor((nodeID: string, parent: NodeL1|n, includeMirrorLinks = true, tagsToIgnore?: string[])=>{
	if (parent == null) return null;
	//let link = parent.children?.[nodeID]; // null-check, since after child-delete, parent-data might have updated before child-data removed
	const parentChildLinks = GetNodeLinks(parent.id, nodeID);
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
						link = Clone(nodeL3ForNodeAsMirrorChildInThisTag.link) as NodeLink;
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

export function IsNodeTitleValid_GetError(node: NodeL1, title: string) {
	if (title.trim().length == 0) return "Title cannot be empty.";
	return null;
}

export function GetAllNodeRevisionTitles(nodeRevision: NodeRevision): string[] {
	if (nodeRevision == null || nodeRevision.phrasing == null) return [];
	return TitleKey_values.map(key=>nodeRevision.phrasing[key]).filter(a=>a != null) as string[];
}

export const missingTitleStrings = ["(base title not set)", "(negation title not set)", "(question title not set)"];
/** Level-1 function to obtain node's display-text; pure function, which uses only the supplied phrasing and form arguments to derive its result. (useful, eg. for exporting server-subtree-data to CSV) */
export const GetNodeTitleFromPhrasingAndForm = CreateAccessor((phrasing: NodePhrasing_Embedded, form: ClaimForm): {rawTitle: string | undefined, desiredField: string, usedField: TitleKey, missingMessage: string}=>{
	// note: text_narrative is not considered below, because it's not used for display within debate-map (only for use in, eg. the papers app)
	const [rawTitle, desiredField, usedField, missingMessage] = ((): [string | undefined, string, TitleKey, string]=>{
		if (form) {
			if (form == ClaimForm.negation) return [phrasing.text_negation, "text_negation", "text_negation", missingTitleStrings[1]];
			if (form == ClaimForm.question) {
				// for now at least, allow fallback to the base title
				if (phrasing.text_question != null && phrasing.text_question.trim().length) return [phrasing.text_question, "text_question", "text_question", missingTitleStrings[2]];
				return [phrasing.text_base, "text_question", "text_base", missingTitleStrings[2]];
			}
		}
		return [phrasing.text_base, "text_base", "text_base", missingTitleStrings[0]];
	})();
	return {rawTitle: (rawTitle?.trim().length ?? 0) > 0 ? rawTitle : undefined, desiredField, usedField, missingMessage};
});
/** Level-2 function to obtain node's display-text; uses only a node's raw title-texts to give its rawTitle result. (useful, eg. for double-click editing of a node's text) */
export const GetNodeRawTitleAndSuch = CreateAccessor((node: NodeL2, path?: string|n, form?: ClaimForm): {rawTitle: string | undefined, desiredField: string, usedField: TitleKey, missingMessage: string}=>{
	form = form || GetNodeForm(node, path);
	const phrasing = node.current.phrasing || {} as NodePhrasing_Embedded;
	return GetNodeTitleFromPhrasingAndForm(phrasing, form);
});

export const UseStandardArgTitleOverCustom = CreateAccessor((rawTitle: string|undefined)=>{
	// in sl-mode, allow custom titles for arguments to actually display in-place of the standard "True, because..." etc. texts
	// (normally, we enforce those standard-texts for arguments, to avoid rhetorical advantage from overriding the "generic container text" -- but sl mostly avoids this concern with a consistent editor team)
	if (SLMode_ForJSCommon() && rawTitle != null) return false;
	// todo: maybe extend branch above (for sl-mode) to accept "sl-layout" as well (for allowing custom arg-titles)
	return true;
});

/** Level-3 function to obtain node's display-text; gets the final display-text for a node. (doesn't include equation explanation, quote sources, etc., since those are obtained and displayed elsewhere) */
export const GetNodeDisplayText = CreateAccessor((node: NodeL2, path?: string|n, map?: DMap|n, form?: ClaimForm, allowPrefixTextHandling = true): string=>{
	const {rawTitle, missingMessage} = GetNodeRawTitleAndSuch(node, path, form);
	let resultTitle = rawTitle || missingMessage;

	if (node.type == NodeType.argument && UseStandardArgTitleOverCustom(rawTitle)) {
		const nodeL3 = GetNodeL3(path);
		if (nodeL3 != null && nodeL3.link?.polarity != null) {
			const displayPolarity = GetDisplayPolarityAtPath(node, path ?? node.id);
			if (nodeL3.link.group == ChildGroup.truth) {
				resultTitle = displayPolarity == Polarity.supporting ? "True, because 🡫" : "False, because 🡫";
			} else if (nodeL3.link.group == ChildGroup.relevance) {
				//resultTitle = displayPolarity == Polarity.supporting ? "Relevance increaser 🡫" : "Relevance decreaser 🡫";
				resultTitle = displayPolarity == Polarity.supporting ? "Relevance increaser 🡫" : "Relevance reducer 🡫";
			} else {
				resultTitle = displayPolarity == Polarity.supporting ? "Argument (supporting)" : "Argument (opposing)";
			}
		} else {
			resultTitle = "Argument (unknown polarity)";
		}
	}

	const titleFromAttachment = GetNodeDisplayTextFromAttachment(node, rawTitle);
	if (titleFromAttachment) resultTitle = titleFromAttachment;

	const childLayout = GetChildLayout_Final(node.current, map);
	// special bracketed-prefix-text handling; in sl mode/layout, extract prefix-text of single-premise into/as its parent argument's main-text, and put other cases above the node into a left-positioned "toolbar button"
	if (allowPrefixTextHandling && ShouldExtractPrefixText(childLayout)) {
		const premises = node.type == NodeType.argument ? GetNodeChildrenL3(node.id).filter(a=>a && a.link?.group == ChildGroup.generic && a.type == NodeType.claim) : [];
		// todo: maybe make-so the prefix-text-extraction is considered canceled in this function (reverting to showing prefix-text in node's display-text), if the GetToolbarItemsToShow ends up not displaying the prefix toolbar-item
		if (node.type == NodeType.argument && premises.length == 1) {
			const extractedPrefixTextInfo = GetExtractedPrefixTextInfo(premises[0], path ? `${path}/${premises[0].id}` : `${node.id}/${premises[0].id}`, map, undefined);
			if (extractedPrefixTextInfo != null && extractedPrefixTextInfo.extractLocation == "parentArgument") {
				resultTitle = extractedPrefixTextInfo.bracketedText;
			}
		} else {
			const ownPrefixTextInfo = GetExtractedPrefixTextInfo(node, path, map, form);
			// regarding second condition: even if prefix-text-extraction searches all forms, we want the node's actual display-text to be based only on the "active form" for the given location
			if (ownPrefixTextInfo != null && ownPrefixTextInfo.prefixTextIsFromActiveForm) {
				resultTitle = ownPrefixTextInfo.regularTextWithSymbol;
			}
		}
	}

	// in SL+NoHeader mode: if there are special sl-related chars at start of text (part-1 of the prefix-text, ie. the symbol/arrow), remove those chars
	if (SLMode_ForJSCommon() && !ShowHeader_ForJSCommon()) {
		resultTitle = resultTitle.replace(/^([➸ ]*)/, "");
	}

	return resultTitle;
});

export const GetNodeDisplayTextFromAttachment = CreateAccessor((node: NodeL2, rawTitle: string|n)=>{
	if (node.type != NodeType.claim) return null;

	const mainAttachment = GetExpandedByDefaultAttachment(node.current);
	if (mainAttachment?.equation) {
		let result = mainAttachment.equation.text;
		//if (node.current.equation.latex && !isBot) {
		if (mainAttachment.equation.latex && typeof window != "undefined" && window["katex"] && window["$"]) {
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
	if ((mainAttachment?.quote || mainAttachment?.media) && (rawTitle?.trim() ?? "").length == 0) {
		let text: string;
		let firstSource: Source;
		if (mainAttachment.quote) {
			text = `The statements below were made`;
			firstSource = mainAttachment.quote.sourceChains[0].sources[0];

			if (firstSource.name) text += ` as part of ${firstSource.name}`;
		} else if (mainAttachment.media) {
			const media = GetMedia(mainAttachment.media.id);
			if (media == null) return "...";
			// if (image.sourceChains == null) return `The ${GetNiceNameForImageType(image.type)} below is unmodified.`; // temp
			text = `The ${GetNiceNameForMediaType(media.type)} below`;
			firstSource = mainAttachment.media.sourceChains[0].sources[0];

			if (firstSource.name) text += `, as part of ${firstSource.name},`;
			text += ` was ${mainAttachment.media.captured ? "captured" : "produced"}`;
		} else {
			Assert(false, "[can't happen]");
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
});

export const IsPremiseOfArgument = CreateAccessor((node: NodeL1, parent: NodeL1|n)=>{
	if (parent == null) return false;
	return node.type == NodeType.claim && parent.type == NodeType.argument;
});

export function GetToolbarItemsToTryToShow(map?: DMap|n) {
	return (map?.extras.toolbarItems?.length ?? 0) > 0 ? map?.extras.toolbarItems! : [{panel: "prefix"}, {panel: "truth"}, {panel: "relevance"}, {panel: "phrasings"}];
}
export function GetToolbarItemsToShow(node: NodeL2, path?: string|n, map?: DMap|n) {
	if (!IsNodeToolbarEnabled(map)) return [];

	let itemsToTryToShow = GetToolbarItemsToTryToShow(map);
	// for category-nodes, block displaying of all toolbar-items other than the prefix-text-extraction, since they look (and are less useful) there
	if (node.type == NodeType.category) {
		itemsToTryToShow = itemsToTryToShow.filter(a=>a.panel == "prefix");
	}

	return itemsToTryToShow.filter((item, index)=>{
		if (item.panel == "prefix") {
			const extractedPrefixTextInfo = GetExtractedPrefixTextInfo(node, path, map);
			if (extractedPrefixTextInfo?.extractLocation != "toolbar") return false;
			return true;
		}
		if (item.panel == "truth" && node.type == NodeType.claim) return true;
		if (item.panel == "relevance" && node.type == NodeType.argument) return true;
		if (item.panel == "tags" && node.type != NodeType.argument) return true;
		if (item.panel == "phrasings" && node.type != NodeType.argument) return true;
		return false;
	});
}
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetNodeChildrenL3, GetParentNode} from "../../nodes.js";
import {Map} from "../../maps/@Map.js";
import {ClaimForm, NodeL2} from "../@Node.js";
import {ChildLayout, GetChildLayout_Final} from "../@NodeRevision.js";
import {ChildGroup, NodeType} from "../@NodeType.js";
import {GetNodeDisplayText, GetToolbarItemsToShow} from "../$node.js";
import {NodePhrasing_Embedded, TitleKey_values} from "../../nodePhrasings/@NodePhrasing.js";

// The node-related functions in this file are specific to use-cases of the society-library (or at least, that is their primary reason for existing).
// They are separated into their own file, to keep the main $node.ts file tidier. (since some of the sl-specific customizations have fairly nuanced logic/decisions)
// ==========

// See "GAD.ts" for definition of these globals.
// (Yes, this is hacky; there's not a straightforward alternative atm though, since startURL + derived-consts are in the "client" package, and moving it to js-common doesn't really fit conceptually.)
export function SLDemo_ForJSCommon(): boolean {
	return globalThis.SLDemo_forJSCommon;
}
export function ShowHeader_ForJSCommon(): boolean {
	return globalThis.ShowHeader_forJSCommon;
}
export function HKMode_ForJSCommon(): boolean {
	return globalThis.HKMode_forJSCommon;
}

export function IsSLModeOrLayout(childLayout: ChildLayout) {
	return childLayout == ChildLayout.slStandard || SLDemo_ForJSCommon(); // see GAD.ts for definition
}

export function ShouldShowNarrativeFormForEditing(childLayout: ChildLayout, phrasing: NodePhrasing_Embedded) {
	return IsSLModeOrLayout(childLayout) || (phrasing.text_narrative ?? "").trim().length > 0;
}

export function ShouldExtractPrefixText(childLayout: ChildLayout) {
	return IsSLModeOrLayout(childLayout);
}
export type PrefixTextExtractLocation = "toolbar" | "parentArgument";
export const WhereShouldNodePrefixTextBeShown = CreateAccessor((node: NodeL2, path?: string|n, form?: ClaimForm): PrefixTextExtractLocation=>{
	if (node.type == NodeType.claim && path != null) {
		const parentNode = GetParentNode(path);
		if (parentNode?.type == NodeType.argument) {
			const premises = GetNodeChildrenL3(parentNode.id).filter(a=>a && a.link?.group == ChildGroup.generic && a.type == NodeType.claim);
			if (premises.length == 1 && premises[0].id == node.id) {
				return "parentArgument";
			}
		}
	}
	return "toolbar";
});
/**
 * There are three parts to the SL prefix-text system:
 * 1) symbol-prefix: arrow/symbol + space [at start; optional]
 * 2) bracketed-text
 * 3) space(s) after bracketed-text [optional]
 * 4*) the regular node text (*: not part of the prefix-text; it's just numbered for reference)
 * 
 * Example input: "➸ [including reasons like] When it's day on one side of the world, it's night on the other side"
 * 
 * This function separates out those parts, returning:
 * * matchStr (parts 1-3 combined): "➸ [including reasons like] "
 * * symbolPrefix (part 1): "➸ "
 * * bracketedText (part 2, exl. the bracket-chars): "including reasons like" 
 * * regularText (part 4): "When it's day on one side of the world, it's night on the other side"
 * * regularTextWithSymbol (parts 1 and 4 combined): "➸ When it's day on one side of the world, it's night on the other side"
 **/
export function GetExtractedPrefixTextInfo_Base(title: string) {
	const match = title.match(/^([➸ ]*)\[([^\]]*)\]( *)/);
	if (match == null) return null;
	const [matchStr, symbolPrefix, bracketedText] = match;
	const regularText = title.slice(matchStr.length);
	const regularTextWithSymbol = symbolPrefix + regularText;
	return {matchStr, symbolPrefix, bracketedText, regularText, regularTextWithSymbol};
}
/** Note: This function may return prefix-text-extraction contents, even if (in one case) it isn't ultimately shown. (specifically, if extraction would go into toolbar, but that item is disabled) */
export function GetExtractedPrefixTextInfo(node: NodeL2, path?: string|n, map?: Map|n, form?: ClaimForm) {
	const childLayout = GetChildLayout_Final(node.current, map);
	const shouldExtract = ShouldExtractPrefixText(childLayout);
	if (!shouldExtract) return null;

	const title = GetNodeDisplayText(node, path, map, form, false);
	let info_base = GetExtractedPrefixTextInfo_Base(title);
	if (info_base == null) {
		// The SL preference is to show a prefix-text for a node, even if that prefix-text is not present in the "active title form" for the given location.
		// So search the other title-forms. (we only search the node's own forms, not external phrasing entries)
		const allTitles = Object.entries(node.current.phrasing).filter(a=>TitleKey_values.includes(a[0] as any)).map(a=>a[1] as string).filter(a=>a != null);
		info_base = allTitles.map(altTitle=>GetExtractedPrefixTextInfo_Base(altTitle)).find(a=>a) ?? null;
		// if we didn't find a prefix-text in any of the title-forms, return null
		if (info_base == null) return null;
	}
	const extractLocation = WhereShouldNodePrefixTextBeShown(node, path, form);

	return {...info_base, extractLocation};
}
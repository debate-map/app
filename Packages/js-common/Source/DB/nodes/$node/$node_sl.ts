import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetNodeChildrenL3, GetParentNode} from "../../nodes.js";
import {Map} from "../../maps/@Map.js";
import {ClaimForm, NodeL2} from "../@Node.js";
import {ChildLayout, GetChildLayout_Final} from "../@NodeRevision.js";
import {ChildGroup, NodeType} from "../@NodeType.js";
import {GetNodeDisplayText} from "../$node.js";

// The node-related functions in this file are specific to use-cases of the society-library (or at least, that is their primary reason for existing).
// They are separated into their own file, to keep the main $node.ts file tidier. (since some of the sl-specific customizations have fairly nuanced logic/decisions)
// ==========

// See "GAD.ts" for definition of these globals.
// (Yes, this is hacky; there's not a straightforward alternative atm though, since startURL + derived-consts are in the "client" package, and moving it to js-common doesn't really fit conceptually.)
export function SLDemo_ForJSCommon() {
	return globalThis.SLDemo_forJSCommon;
}
export function ShowHeader_ForJSCommon() {
	return globalThis.ShowHeader_forJSCommon;
}
export function HKMode_ForJSCommon() {
	return globalThis.HKMode_forJSCommon;
}

export function ShouldExtractPrefixText(childLayout: ChildLayout) {
	return childLayout == ChildLayout.slStandard || SLDemo_ForJSCommon(); // see GAD.ts for definition
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
export function GetExtractedPrefixTextInfo_Base(title: string) {
	const match = title.match(/^([➸ ]*)\[([^\]]*)\]( *)/);
	if (match == null) return null;
	const [matchStr, specialCharsAtStart, prefixText] = match;
	return {matchStr, specialCharsAtStart, prefixText, titleWithoutPrefix: specialCharsAtStart + title.slice(matchStr.length)};
}
export function GetExtractedPrefixTextInfo(node: NodeL2, path?: string|n, map?: Map|n, form?: ClaimForm) {
	const childLayout = GetChildLayout_Final(node.current, map);
	const shouldExtract = ShouldExtractPrefixText(childLayout);
	if (!shouldExtract) return null;

	const title = GetNodeDisplayText(node, path, map, form, false);
	const info_base = GetExtractedPrefixTextInfo_Base(title);
	if (info_base == null) return null;
	const extractLocation = WhereShouldNodePrefixTextBeShown(node, path, form);
	return {...info_base, extractLocation};
}
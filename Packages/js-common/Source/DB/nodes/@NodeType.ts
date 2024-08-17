import {Assert, AssertWarn, CE, CreateStringEnum, GetValues, GetValues_ForSchema} from "js-vextensions";
import {AddSchema} from "mobx-graphlink";
import {NodeL1, NodeL3} from "./@Node.js";
import {SLMode_ForJSCommon} from "./$node/$node_sl.js";
import {ChildGroup, ClaimForm, Polarity, childGroupsWithPolarity_required} from "../nodeLinks/@NodeLink.js";
import {NewChildConfig} from "../nodeLinks/NodeLinkValidity.js";

export enum NodeType {
	category = "category",
	package = "package",
	multiChoiceQuestion = "multiChoiceQuestion",
	claim = "claim",
	argument = "argument",
    comment = "comment"
}
//AddSchema("NodeType", {enum: GetValues(NodeType)});
AddSchema("NodeType", {enum: GetValues(NodeType)});

const freeformTypes = [NodeType.category, NodeType.package, NodeType.multiChoiceQuestion, NodeType.claim, NodeType.argument];

export class NodeType_Info {
	static for = {
		[NodeType.category]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [NodeType.category, NodeType.package, NodeType.multiChoiceQuestion, NodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
				[ChildGroup.comment, [NodeType.comment]],
			]),
			minWidth: 150, maxWidth: 250,
			/*mainRatingTypes: ["significance"],
			otherRatingTypes: [],*/
		}),
		[NodeType.package]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [NodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
				[ChildGroup.comment, [NodeType.comment]],
			]),
			minWidth: 150, maxWidth: 250,
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[NodeType.multiChoiceQuestion]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [NodeType.claim]],
				[ChildGroup.freeform, freeformTypes],
				[ChildGroup.comment, [NodeType.comment]],
			]),
			minWidth: 150, maxWidth: 600,
			// minWidth: 100, maxWidth: 200, backgroundColor: "230,150,50",
			/* mainRatingTypes: ["significance"],
			otherRatingTypes: [], */
		}),
		[NodeType.claim]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.truth, [NodeType.argument, NodeType.claim]], // note: if child is "claim", link should have polarity (filling role of single-premise argument, but with no relevance-args possible; used in SL maps)
				[ChildGroup.freeform, freeformTypes],
				[ChildGroup.comment, [NodeType.comment]],
			]),
			//minWidth: 350, maxWidth: 600,
			minWidth: 150, maxWidth: 600, // probably temp
			// mainRatingTypes: ["probability", "intensity"],
			// mainRatingTypes: ["probability", "support"],
			/* mainRatingTypes: ["probability", "truth"],
			otherRatingTypes: [], */
		}),
		[NodeType.argument]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.generic, [NodeType.claim]],
				[ChildGroup.relevance, [NodeType.argument]],
				[ChildGroup.freeform, freeformTypes],
				[ChildGroup.comment, [NodeType.comment]],
			]),
			// TODO: Figure out what this does
			minWidth: 80, maxWidth: 600,
			/* mainRatingTypes: ["strength"],
			otherRatingTypes: [], */
		}),
		[NodeType.comment]: new NodeType_Info({
			childGroup_childTypes: new Map([
				[ChildGroup.comment, [NodeType.comment]],
			]),
			//minWidth: 150, maxWidth: 600,
			//minWidth: 80, maxWidth: 380, // keep width small enough that it fits within gap before premise's node-toolbar
			minWidth: 80, maxWidth: 600,
			/* mainRatingTypes: ["strength"],
			otherRatingTypes: [], */
		}),
	} as {[key: string]: NodeType_Info};

	private constructor(initialData: Partial<NodeType_Info>) {
		CE(this).VSet(initialData);
	}

	// displayName: (parentNode: NodeL2)=>string;
	childGroup_childTypes: Map<ChildGroup, NodeType[]>;
	minWidth: number;
	maxWidth: number;
	// fontSize?: number;
	// get fontSize() { return 14; }
	/* mainRatingTypes: RatingType[];
	otherRatingTypes: RatingType[]; */
}
/*export function GetNodeTypeInfo(type: NodeType) {
	return NodeType_Info.for[type];
}*/

/*export function GetDisplayTextForNewChildConfig(parentNode: NodeL1, parentNodeForm: ClaimForm, c: NewChildConfig) {
	return [
		// basic type
		c.childType == NodeType.category && "category",
		c.childType == NodeType.package && "package",
		c.childType == NodeType.multiChoiceQuestion && "multi-choice question",
		c.childType == NodeType.claim && (()=>{
			if (c.polarity != null && !c.addWrapperArg) {
				//AssertWarn(SLMode_ForJSCommon, "Polarity for a link with a claim child, should only happen when in sl-mode.");
				return c.polarity == Polarity.supporting ? "supporting claim" : "opposing claim";
			}
			if (parentNode && parentNode.type == NodeType.category) return "claim / binary question";
			return "claim";
		})(),
		c.childType == NodeType.argument && (()=>{
			return c.polarity == Polarity.supporting ? "supporting argument" : "opposing argument";
		})(),
		// extras
		c.addWrapperArg && "(in wrapper arg)",
		parentNode.type == NodeType.argument && c.childGroup == ChildGroup.generic && c.polarity == null && "(premise)",
	].filter(a=>a).join(" ");
}*/
export function GetDisplayTextForNewChildConfig(parentNode: NodeL1, c: NewChildConfig, forPaste: boolean, details: {/*omitGroup?: boolean,*/ copiedNode_asCut?: boolean}) {
	const polarityStr = c.polarity == Polarity.supporting ? "pro" : "con";
	// showing the child-group in parentheses is not-helpful-enough/too-distracting for certain groups, when adding/pasting
	const omitGroup = forPaste
		? c.childGroup == ChildGroup.generic
		: c.childGroup.IsOneOf(ChildGroup.generic, ChildGroup.freeform);

	let parenthesesStr_inner = [
		parentNode.type == NodeType.argument && c.childGroup == ChildGroup.generic && c.polarity == null && "premise",
		c.polarity != null && c.childGroup != ChildGroup.freeform && polarityStr,
		!omitGroup && c.childGroup,
	].filter(a=>a).join(" ");
	if (c.polarity != null && c.childGroup == ChildGroup.freeform) {
		parenthesesStr_inner += (parenthesesStr_inner.length ? ", " : "") + polarityStr;
	}
	const parenthesesStr_outer = parenthesesStr_inner.length > 0 ? `(${parenthesesStr_inner})` : "";

	return [
		//!forPaste && "New", // the "new" is added by the caller atm (since some callers don't want it)
		//forPaste && `Paste (${details.copiedNode_asCut ? "move" : "link"}) ${c.addWrapperArg ? "in new" : "as"}`,
		forPaste && `${details.copiedNode_asCut ? "Move" : "Link"} here ${c.addWrapperArg ? "in new" : "as"}`,
		c.addWrapperArg && `argument`,
		!c.addWrapperArg && (c.childType == NodeType.multiChoiceQuestion ? "multi-choice question" : c.childType),
		parenthesesStr_outer,
	].filter(a=>a).join(" ");
}


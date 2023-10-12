import {IR_NodeAndRevision, ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {ArgumentType, ChildGroup, ClaimForm, CullNodePhrasingToBeEmbedded, GetSystemAccessPolicyID, NodeL1, NodeLink, NodePhrasing, NodePhrasingType, NodeRevision, NodeType, OrderKey, systemUserID} from "dm_common";
import {Assert} from "js-vextensions";
import {CG_Category, CG_Claim, CG_Debate, CG_Node, CG_Position, CG_Question} from "./DataModel.js";

export class ImportContext {
	mapID: string;
	nodeAccessPolicyID: string;
}

export const GetResourcesInImportSubtree_CG = CreateAccessor((context: ImportContext, debate: CG_Debate)=>{
	const result = [] as ImportResource[];
	for (const [i, question] of debate.questions.entries()) {
		result.push(...GetResourcesInQuestion_CG(context, question, [i], [CG_Node.GetTitle_Main(question)]));
	}
	return result;
});
export const GetResourcesInQuestion_CG = CreateAccessor((context: ImportContext, question: CG_Question, path_indexes: number[], path_titles: string[])=>{
	const result = [] as ImportResource[];
	result.push(NewNodeResource(context, question, NodeType.category, path_indexes, path_titles));
	for (const [i, position] of question.positions.entries()) {
		result.push(...GetResourcesInPosition_CG(context, position, path_indexes.concat(i), path_titles.concat(CG_Node.GetTitle_Main(position))));
	}
	return result;
});
export const GetResourcesInPosition_CG = CreateAccessor((context: ImportContext, position: CG_Position, path_indexes: number[], path_titles: string[])=>{
	const result = [] as ImportResource[];
	// debate-map's ui defaults new claims under category-nodes to use form "question"; match that behavior for consistency (SL also relies on this)
	result.push(NewNodeResource(context, position, NodeType.claim, path_indexes, path_titles, undefined, ClaimForm.question));
	for (const [i, category] of position.categories.entries()) {
		result.push(...GetResourcesInCategory_CG(context, category, path_indexes.concat(i), path_titles.concat(CG_Node.GetTitle_Main(category))));
	}
	return result;
});
export const GetResourcesInCategory_CG = CreateAccessor((context: ImportContext, category: CG_Category, path_indexes: number[], path_titles: string[])=>{
	const result = [] as ImportResource[];
	result.push(NewNodeResource(context, category, NodeType.category, path_indexes, path_titles, ChildGroup.freeform));
	for (const [i, claim] of category.claims.entries()) {
		// debate-map's ui defaults new claims under category-nodes to use form "question"; match that behavior for consistency (SL also relies on this)
		result.push(NewNodeResource(context, claim, NodeType.claim, path_indexes.concat(i), path_titles.concat(CG_Node.GetTitle_Main(claim)), undefined, ClaimForm.question));
	}
	return result;
});
export const NewNodeResource = CreateAccessor((context: ImportContext, data: CG_Node, nodeType: NodeType, path_indexes: number[], path_titles: string[], childGroup = ChildGroup.generic, claimForm?: ClaimForm)=>{
	const node = new NodeL1({
		//creator: systemUserID,
		//createdAt: Date.now(),
		type: nodeType,
		//c_currentRevision: revID, // not needed; connected by server
		accessPolicy: context.nodeAccessPolicyID,
		// todo: get this included in the new node! (probably update backend to accept the "extras" field as part of initial node-creation -- perhaps by calling update-node internally to set it, within the same transaction)
		/*extras: {
			// this isn't really needed (claim-gen's ids are currently transient), but might as well keep it
			externalId: `claimgen:${data.id}`,
		},*/
	});

	let orderKey = OrderKey.mid();
	const ownIndexUnderParent = path_indexes.Last();
	for (let i = 0; i < ownIndexUnderParent; i++) {
		orderKey = orderKey.next();
	}
	const link = new NodeLink({
		//createdAt: node.createdAt,
		//creator: systemUserID,
		group: childGroup,
		orderKey: orderKey.toString(),
		form: claimForm,
	});

	const mainTitle = CG_Node.GetTitle_Main(data);
	const narrativeTitle = CG_Node.GetTitle_Narrative(data);
	const placementInMapWantsQuestionFormSupplied = claimForm == ClaimForm.question;

	let text_base: string;
	let text_question: string|n;
	// if narrative-title was supplied, store it using the current SL pattern (of text_base for narrative title, text_question for regular/main title)
	if (narrativeTitle != null) {
		Assert(nodeType == NodeType.claim, "Narrative-title should only be supplied for claims. (ui doesn't support editing other titles for non-claim nodes)");
		text_base = narrativeTitle;
		text_question = mainTitle;
	}
	// if no narrative-title was supplied, but the placement in map has debate-map wanting/displaying the question-form, then just use the main-title to fill both title fields
	else if (placementInMapWantsQuestionFormSupplied) {
		text_base = mainTitle;
		text_question = mainTitle;
	}
	// else, just supply the main-title as text_base (this is what's expected for many nodes, eg. category nodes)
	else {
		text_base = mainTitle;
	}

	const revision = new NodeRevision({
		//createdAt: Date.now(),
		//creator: systemUserID,
		displayDetails: undefined,
		attachments: [],
		node: node.id,
		phrasing: CullNodePhrasingToBeEmbedded(new NodePhrasing({
			id: GenerateUUID(),
			type: NodePhrasingType.standard,
			createdAt: Date.now(),
			creator: systemUserID,
			node: node.id,
			...(text_question != null
				? {text_base, text_question}
				: {text_base}),
		})),
	});
	return new IR_NodeAndRevision({
		pathInData: path_indexes,
		link, node, revision,
		insertPath_titles: path_titles.slice(0, -1), // insert-path should exclude this new node itself
		ownTitle: path_titles.Last(),
	});
});
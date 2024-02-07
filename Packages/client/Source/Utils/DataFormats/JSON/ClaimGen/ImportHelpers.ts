import {IR_NodeAndRevision, ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {ArgumentType, ChildGroup, ClaimForm, CullNodePhrasingToBeEmbedded, GetSystemAccessPolicyID, NodeL1, NodeLink, NodePhrasing, NodePhrasingType, NodeRevision, NodeType, OrderKey, systemUserID} from "dm_common";
import {Assert, IsString} from "js-vextensions";
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
	const questionResource = NewNodeResource(context, question, NodeType.category, path_indexes, path_titles, null);
	result.push(questionResource);
	for (const [i, position] of question.positions.entries()) {
		result.push(...GetResourcesInPosition_CG(context, position, path_indexes.concat(i), path_titles.concat(CG_Node.GetTitle_Main(position)), questionResource));
	}
	return result;
});
export const GetResourcesInPosition_CG = CreateAccessor((context: ImportContext, position: CG_Position, path_indexes: number[], path_titles: string[], parentResource: ImportResource)=>{
	const result = [] as ImportResource[];
	// debate-map's ui defaults new claims under category-nodes to use form "question"; match that behavior for consistency, though these claim-gen imports won't fill text_question, so ui will fallback to showing text_base
	//const positionResource = NewNodeResource(context, position, NodeType.claim, path_indexes, path_titles, undefined, ClaimForm.question);
	const positionResource = NewNodeResource(context, position, NodeType.claim, path_indexes, path_titles, parentResource);
	result.push(positionResource);
	for (const [i, category] of position.categories.entries()) {
		result.push(...GetResourcesInCategory_CG(context, category, path_indexes.concat(i), path_titles.concat(CG_Node.GetTitle_Main(category)), positionResource));
	}
	return result;
});
export const GetResourcesInCategory_CG = CreateAccessor((context: ImportContext, category: CG_Category, path_indexes: number[], path_titles: string[], parentResource: ImportResource)=>{
	const result = [] as ImportResource[];
	const categoryResource = NewNodeResource(context, category, NodeType.category, path_indexes, path_titles, parentResource, ChildGroup.freeform);
	result.push(categoryResource);
	for (const [i, claim] of category.claims.entries()) {
		result.push(...GetResourcesInClaim_CG(context, claim, path_indexes.concat(i), path_titles.concat(CG_Node.GetTitle_Main(claim)), categoryResource));
	}
	return result;
});
export const GetResourcesInClaim_CG = CreateAccessor((context: ImportContext, claim: CG_Claim, path_indexes: number[], path_titles: string[], parentResource: ImportResource)=>{
	const result = [] as ImportResource[];
	// debate-map's ui defaults new claims under category-nodes to use form "question"; match that behavior for consistency, though these claim-gen imports won't fill text_question, so ui will fallback to showing text_base
	//const claimResource = NewNodeResource(context, claim, NodeType.claim, path_indexes, path_titles, undefined, ClaimForm.question);
	const claimResource = NewNodeResource(context, claim, NodeType.claim, path_indexes, path_titles, parentResource);
	result.push(claimResource);
	for (const [i, argument] of (claim.arguments ?? []).entries()) {
		result.push(NewNodeResource(context, argument, NodeType.claim, path_indexes.concat(i), path_titles.concat(argument), claimResource, ChildGroup.freeform));
	}
	return result;
});
export const NewNodeResource = CreateAccessor((context: ImportContext, data: CG_Node|string, nodeType: NodeType, path_indexes: number[], path_titles: string[], parentResource: ImportResource|n, childGroup = ChildGroup.generic, claimForm?: ClaimForm)=>{
	const node = new NodeL1({
		//creator: systemUserID,
		//createdAt: Date.now(),
		type: nodeType,
		//c_currentRevision: revID, // not needed; connected by server
		accessPolicy: context.nodeAccessPolicyID,
		extras: {
			// this isn't really needed (claim-gen's ids are currently transient), but might as well keep it
			externalId: `claimgen:${IsString(data) ? "no-id" : data.id}`,
		},
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

	const mainTitle = IsString(data) ? data : CG_Node.GetTitle_Main(data);
	const narrativeTitle = IsString(data) ? null : CG_Node.GetTitle_Narrative(data);
	//const placementInMapWantsQuestionFormSupplied = claimForm == ClaimForm.question;
	if (narrativeTitle != null) {
		Assert(nodeType == NodeType.claim, "Narrative-title should only be supplied for claims. (ui doesn't support editing other titles for non-claim nodes)");
	}

	const revision = new NodeRevision({
		//createdAt: Date.now(),
		//creator: systemUserID,
		displayDetails: undefined,
		attachments: IsString(data) ? [] : CG_Node.GetReferenceURLsAsAttachments(data),
		node: node.id,
		phrasing: CullNodePhrasingToBeEmbedded(new NodePhrasing({
			id: GenerateUUID(),
			type: NodePhrasingType.standard,
			createdAt: Date.now(),
			creator: systemUserID,
			node: node.id,
			...(narrativeTitle != null
				? {text_base: mainTitle, text_narrative: narrativeTitle}
				: {text_base: mainTitle}),
		})),
	});
	return new IR_NodeAndRevision({
		pathInData: path_indexes,
		link, node, revision,
		insertPath_titles: path_titles.slice(0, -1), // insert-path should exclude this new node itself
		insertPath_parentResourceLocalID: parentResource?.localID,
		ownTitle: path_titles.Last(),
	});
});
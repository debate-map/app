import {IR_NodeAndRevision, ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {ArgumentType, Attachment, ChildGroup, ClaimForm, CullNodePhrasingToBeEmbedded, GetSystemAccessPolicyID, NodeL1, NodeLink, NodePhrasing, NodePhrasingType, NodeRevision, NodeType, OrderKey, Polarity, systemUserID} from "dm_common";
import {Assert, IsString} from "js-vextensions";
import {AddNotificationMessage} from "web-vcore";
import {CG_Argument, CG_Category, CG_Claim, CG_Debate, CG_Evidence, CG_Node, CG_Position, CG_Question} from "./DataModel.js";

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

	const args = [] as CG_Argument[];
	const wrapArg = (arg: string | CG_Argument)=>IsString(arg) ? {argument: arg} as CG_Argument : arg;
	if (claim.argument) args.push(wrapArg(claim.argument));
	if (claim.arguments) args.push(...claim.arguments.map(wrapArg));
	if (claim.examples) args.push(...claim.examples.map(wrapArg));
	if (claim.counter_claims) args.push(...claim.counter_claims.map(wrapArg));
	if (claim.counter_claim) args.push(wrapArg(claim.counter_claim));
	for (const [i, argument] of args.entries()) {
		result.push(...GetResourcesInArgument_CG(context, argument, path_indexes.concat(i), path_titles.concat(CG_Node.GetTitle_Main(argument)), claimResource));
	}

	return result;
});
export const GetResourcesInArgument_CG = CreateAccessor((context: ImportContext, argument: CG_Argument, path_indexes: number[], path_titles: string[], parentResource: ImportResource)=>{
	const result = [] as ImportResource[];
	const argumentResource = NewNodeResource(context, argument, NodeType.claim, path_indexes, path_titles, parentResource, ChildGroup.freeform);
	result.push(argumentResource);

	for (const [i, evidence] of (argument.evidence ?? []).entries()) {
		result.push(NewNodeResource(context, evidence, NodeType.claim, path_indexes.concat(i), path_titles.concat(CG_Node.GetTitle_Main(evidence)), argumentResource, ChildGroup.truth));
	}

	return result;
});

let hasWarned_id = false;
export const NewNodeResource = CreateAccessor((context: ImportContext, data: CG_Node, nodeType: NodeType, path_indexes: number[], path_titles: string[], parentResource: ImportResource|n, childGroup = ChildGroup.generic, claimForm?: ClaimForm)=>{
	if (data.id != null && !hasWarned_id) {
		hasWarned_id = true;
		AddNotificationMessage(`ClaimGen import: node has been found using the deprecated field "id", with value "${data.id}". This id will be ignored. (new format uses extras.TOOL_NAMESPACE.id)`);
	}

	const node = new NodeL1({
		//creator: systemUserID,
		//createdAt: Date.now(),
		type: nodeType,
		//c_currentRevision: revID, // not needed; connected by server
		accessPolicy: context.nodeAccessPolicyID,
		/*extras: {
			// this isn't really needed (claim-gen's ids are currently transient), but might as well keep it
			externalId: `claimgen:${data.id ?? "no-id"}`,
		},*/
		extras: data.extras,
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
	if (CG_Evidence.is(data)) {
		const evidence = data as CG_Evidence;
		link.polarity =
			evidence.stance == "supports" ? Polarity.supporting :
			evidence.stance == "refutes" ? Polarity.opposing :
			Polarity.supporting;
	}

	const mainTitle = CG_Node.GetTitle_Main(data);
	const narrativeTitle = CG_Node.GetTitle_Narrative(data);
	//const placementInMapWantsQuestionFormSupplied = claimForm == ClaimForm.question;
	if (narrativeTitle != null) {
		Assert(nodeType == NodeType.claim, "Narrative-title should only be supplied for claims. (ui doesn't support editing other titles for non-claim nodes)");
	}

	const revision = new NodeRevision({
		//createdAt: Date.now(),
		//creator: systemUserID,
		displayDetails: undefined,
		attachments: CG_Node.GetAttachments(data),
		node: node.id,
		phrasing: {
			...(narrativeTitle != null
				? {text_base: mainTitle, text_narrative: narrativeTitle}
				: {text_base: mainTitle}),
			terms: [],
		},
	});
	return new IR_NodeAndRevision({
		pathInData: path_indexes,
		link, node, revision,
		insertPath_titles: path_titles.slice(0, -1), // insert-path should exclude this new node itself
		insertPath_parentResourceLocalID: parentResource?.localID,
		ownTitle: path_titles.Last(),
	});
});
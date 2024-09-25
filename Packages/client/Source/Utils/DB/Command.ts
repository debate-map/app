import {AccessPolicy, NodeTag, Media, Share, Term, NodePhrasing, NodeRevision, DMap, NodeRating, NodeLink, NodeL1, UserFollow, User, UserHidden, NodeL1Input, ClaimForm, ChildGroup, Polarity, NodeInfoForTransfer, NodeRevisionInput, Timeline, TimelineStep, Subscription, Notification, AddSubscriptionInput, GetNodeSubscription, MeID, SubscriptionLevel, GetSubscriptionLevel} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {FetchResult, gql} from "@apollo/client";

// standardized add/update/delete commands
// ==========

function CreateFunc_RunCommand_AddX<ResultShape = {id: string}, T = any>(classConstructor: new(..._)=>T, entryFieldName: string, className = classConstructor.name) {
	return async function(entry: T) {
		const inputFields = {[entryFieldName]: entry};
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Add${className}Input!) {
					add${className}(input: $input) { id }
				}
			`,
			variables: {input: inputFields},
		});
		return result.data[`add${className}`] as ResultShape;
	};
}
function CreateFunc_RunCommand_DeleteX<ResultShape = {}, T = any>(classConstructor: new(..._)=>T, className = classConstructor.name) {
	return async function(inputFields: {id: string}) {
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Delete${className}Input!) {
					delete${className}(input: $input) { __typename }
				}
			`,
			variables: {input: inputFields},
		});
		return result.data[`delete${className}`] as ResultShape;
	};
}
function CreateFunc_RunCommand_UpdateX<ResultShape = {}, T = any>(classConstructor: new(..._)=>T, className = classConstructor.name) {
	return async function(inputFields: {id: string, updates: Partial<T>}) {
		const result = await apolloClient.mutate({
			mutation: gql`
				mutation($input: Update${className}Input!) {
					update${className}(input: $input) { __typename }
				}
			`,
			variables: {input: inputFields},
		});
		return result.data[`update${className}`] as ResultShape;
	};
}

export const RunCommand_AddAccessPolicy = CreateFunc_RunCommand_AddX(AccessPolicy, "policy");
export const RunCommand_AddMap = CreateFunc_RunCommand_AddX(DMap, "map", "Map");
export const RunCommand_AddMedia = CreateFunc_RunCommand_AddX(Media, "media");
export const RunCommand_AddNodeLink = CreateFunc_RunCommand_AddX(NodeLink, "link");
export const RunCommand_AddNodePhrasing = CreateFunc_RunCommand_AddX(NodePhrasing, "phrasing");
export const RunCommand_AddNodeTag = CreateFunc_RunCommand_AddX(NodeTag, "tag");
export const RunCommand_AddShare = CreateFunc_RunCommand_AddX(Share, "share");
export const RunCommand_AddTerm = CreateFunc_RunCommand_AddX(Term, "term");
export const RunCommand_AddTimeline = CreateFunc_RunCommand_AddX(Timeline, "timeline");
export const RunCommand_AddTimelineStep = CreateFunc_RunCommand_AddX(TimelineStep, "step");

export const RunCommand_DeleteAccessPolicy = CreateFunc_RunCommand_DeleteX(AccessPolicy);
export const RunCommand_DeleteMap = CreateFunc_RunCommand_DeleteX(DMap, "Map");
export const RunCommand_DeleteMedia = CreateFunc_RunCommand_DeleteX(Media);
export const RunCommand_DeleteNodeLink = CreateFunc_RunCommand_DeleteX(NodeLink);
export const RunCommand_DeleteNodePhrasing = CreateFunc_RunCommand_DeleteX(NodePhrasing);
export const RunCommand_DeleteNodeTag = CreateFunc_RunCommand_DeleteX(NodeTag);
export const RunCommand_DeleteShare = CreateFunc_RunCommand_DeleteX(Share);
export const RunCommand_DeleteTerm = CreateFunc_RunCommand_DeleteX(Term);
export const RunCommand_DeleteTimeline = CreateFunc_RunCommand_DeleteX(Timeline);
export const RunCommand_DeleteTimelineStep = CreateFunc_RunCommand_DeleteX(TimelineStep);

export const RunCommand_UpdateAccessPolicy = CreateFunc_RunCommand_UpdateX(AccessPolicy);
export const RunCommand_UpdateMap = CreateFunc_RunCommand_UpdateX(DMap, "Map");
export const RunCommand_UpdateMedia = CreateFunc_RunCommand_UpdateX(Media);
export const RunCommand_UpdateNodeLink = CreateFunc_RunCommand_UpdateX(NodeLink);
export const RunCommand_UpdateNodePhrasing = CreateFunc_RunCommand_UpdateX(NodePhrasing);
export const RunCommand_UpdateNodeTag = CreateFunc_RunCommand_UpdateX(NodeTag);
export const RunCommand_UpdateShare = CreateFunc_RunCommand_UpdateX(Share);
export const RunCommand_UpdateTerm = CreateFunc_RunCommand_UpdateX(Term);
export const RunCommand_UpdateTimeline = CreateFunc_RunCommand_UpdateX(Timeline);
export const RunCommand_UpdateTimelineStep = CreateFunc_RunCommand_UpdateX(TimelineStep);

// other commands
// ==========

/*export type CommandEntry = {addChildNode?: AddChildNodeInput, setParentNodeToResultOfCommandAtIndex?: number};
export async function RunCommand_RunCommandBatch(inputFields: {commands: CommandEntry[]}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: RunCommandBatchInput!) { runCommandBatch(input: $input) { results } }`,
		variables: {input: inputFields},
	});
	//return result.data.runCommandBatch as {results: any[]};
	return result as FetchResult<{runCommandBatch: {results: any[]}}>;
}*/

export async function RunCommand_AddArgumentAndClaim(inputFields: {
	mapID: string|n,
	argumentParentID: string,
	argumentNode: NodeL1Input,
	argumentRevision: Partial<NodeRevision>,
	argumentLink: Partial<NodeLink>,
	claimNode: NodeL1Input,
	claimRevision: Partial<NodeRevision>,
	claimLink: Partial<NodeLink>,
}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: AddArgumentAndClaimInput!) { addArgumentAndClaim(input: $input) { argumentNodeID argumentRevisionID claimNodeID claimRevisionID doneAt } }`,
		variables: {input: inputFields},
	});
	return result.data.addArgumentAndClaim as {argumentNodeID: string, argumentRevisionID: string, claimNodeID: string, claimRevisionID: string, doneAt: number};
}

export type AddChildNodeInput = {
	mapID: string|n,
	parentID: string,
	node: NodeL1Input,
	revision: Partial<NodeRevision>,
	link: Partial<NodeLink>,
};
export async function RunCommand_AddChildNode(inputFields: AddChildNodeInput) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: AddChildNodeInput!) { addChildNode(input: $input) { nodeID revisionID linkID doneAt } }`,
		variables: {input: inputFields},
	});
	return result.data.addChildNode as {nodeID: string, revisionID: string, linkID: string, doneAt: number};
}

/*type NodeRevisionInput =
	Omit<Partial<NodeRevision>, "id" | "creator" | "createdAt">
	& {id?: never, creator?: never, createdAt?: never};*/
//type NodeRevisionInput = Partial<NodeRevision> & {id?: never, creator?: never, createdAt?: never};
export async function RunCommand_AddNodeRevision(inputFields: {mapID?: string|n, revision: NodeRevisionInput}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: AddNodeRevisionInput!) { addNodeRevision(input: $input) { id } }`,
		variables: {input: inputFields},
	});
	return result.data.addNodeRevision as {id: string};
}

// todo: eventually remove (or rework) this command, since unused
/*export async function RunCommand_DeleteArgument(inputFields: {mapID?: string|n, argumentID: string, claimID: string, deleteClaim: boolean}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: DeleteArgumentInput!) { deleteArgument(input: $input) { __typename } }`,
		variables: {input: inputFields},
	});
	return result.data.deleteArgument as {};
}*/

export async function RunCommand_DeleteNode(inputFields: {mapID?: string|n, nodeID: string}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: DeleteNodeInput!) { deleteNode(input: $input) { __typename } }`,
		variables: {input: inputFields},
	});
	return result.data.deleteNode as {};
}

export const RunCommand_DeleteNodeRating = CreateFunc_RunCommand_DeleteX(NodeRating);
export const RunCommand_DeleteNodeRevision = CreateFunc_RunCommand_DeleteX(NodeRevision);

type LinkNodeInputFields = {
	mapID?: string|n, oldParentID?: string|n, newParentID: string, nodeID: string,
	newForm?: ClaimForm|n, newPolarity?: Polarity|n,
	//createWrapperArg?: boolean,
	childGroup: ChildGroup,
	//linkAsArgument?: boolean,
	unlinkFromOldParent?: boolean, deleteEmptyArgumentWrapper?: boolean
};
export async function RunCommand_LinkNode(inputFields: LinkNodeInputFields) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: LinkNodeInput!) { linkNode(input: $input) { argumentWrapperID } }`,
		variables: {input: inputFields},
	});
	return result.data.linkNode as {argumentWrapperID: string};
}

export async function RunCommand_SetNodeRating(inputFields: {rating: NodeRating}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: SetNodeRatingInput!) { setNodeRating(input: $input) { id } }`,
		variables: {input: inputFields},
	});
	return result.data.setNodeRating as {id: string};
}

// todo: eventually remove this command, since unused
/*export async function RunCommand_SetNodeIsMultiPremiseArgument(inputFields: {id: string, multiPremiseArgument: boolean|n}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: SetNodeIsMultiPremiseArgumentInput!) { setNodeIsMultiPremiseArgument(input: $input) { __typename } }`,
		variables: {input: inputFields},
	});
	return result.data.setNodeIsMultiPremiseArgument as {};
}*/

export async function RunCommand_SetUserFollowData(inputFields: {targetUser: string, userFollow: UserFollow|n}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: SetUserFollowDataInput!) { setUserFollowData(input: $input) { __typename } }`,
		variables: {input: inputFields},
	});
	return result.data.setUserFollowData as {};
}

export async function RunCommand_TransferNodes(inputFields: {mapID?: string|n, nodes: NodeInfoForTransfer[]}) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: TransferNodesInput!) { transferNodes(input: $input) { __typename } }`,
		variables: {input: inputFields},
	});
	return result.data.transferNodes as {};
}

export async function RunCommand_AddSubscription(inputFields: AddSubscriptionInput) {
	const result = await apolloClient.mutate({
		mutation: gql`mutation($input: AddSubscriptionInput!) { addSubscription(input: $input) { id } }`,
		variables: {input: inputFields},
	});
	return result.data.addSubscription as {id: string};
}

export async function RunCommand_AddSubscriptionWithLevel({node, level}: {node: string, level: SubscriptionLevel}) {
	switch (level) {
		case SubscriptionLevel.None:
			await RunCommand_AddSubscription({node, addChildNode: false, addNodeLink: false, addNodeRevision: false, deleteNode: false, deleteNodeLink: false, setNodeRating: false});
			break;
		case SubscriptionLevel.Partial:
			await RunCommand_AddSubscription({node, addChildNode: true, addNodeLink: false, addNodeRevision: true, deleteNode: false, deleteNodeLink: false, setNodeRating: false});
			break;
		case SubscriptionLevel.All:
			await RunCommand_AddSubscription({node, addChildNode: true, addNodeLink: true, addNodeRevision: true, deleteNode: true, deleteNodeLink: true, setNodeRating: true});
			break;
		default:
			throw new Error(`Unknown subscription level: ${level}`);
	}
}

export const RunCommand_UpdateNode = CreateFunc_RunCommand_UpdateX(NodeL1, "Node");
export const RunCommand_UpdateUser = CreateFunc_RunCommand_UpdateX(User);
export const RunCommand_UpdateUserHidden = CreateFunc_RunCommand_UpdateX(UserHidden);
export const RunCommand_UpdateNotification = CreateFunc_RunCommand_UpdateX(Notification);

export const RunCommand_UpdateSubscription = CreateFunc_RunCommand_UpdateX(Subscription);

export function RunCommand_DeleteSubtree(inputFields: {mapId?: string|n, rootNodeId: string, maxDepth?: number|n}, onProgress?: (subcommandsCompleted: number, subcommandsTotal: number)=>void) {
	const fetchResult_subscription = apolloClient.subscribe<{deleteSubtree: DeleteSubtreeResult}>({
		query: gql`
			subscription($input: DeleteSubtreeInput!) {
				deleteSubtree(input: $input) { subcommandCount subcommandResults committed }
			}
		`,
		variables: {input: inputFields},
	});
	type DeleteSubtreeResult = {subcommandCount: number, subcommandResults: Object[], committed: boolean};
	return new Promise<DeleteSubtreeResult>((resolve, reject)=>{
		const subscription = fetchResult_subscription.subscribe(data=>{
			if ((data.errors?.length ?? 0) > 0) {
				subscription.unsubscribe(); // unsubscribe if error occurs
				return void reject(new Error(`Error during DeleteSubtree: ${JSON.stringify(data.errors)}`));
			}
			if (data.data == null) {
				subscription.unsubscribe(); // unsubscribe if error occurs
				return void reject(new Error(`No data returned from DeleteSubtree.`));
			}

			const latestResult = data.data.deleteSubtree;
			onProgress?.(latestResult.subcommandResults.length, latestResult.subcommandCount);
			if (latestResult.committed) {
				subscription.unsubscribe(); // unsubscribe if done
				resolve(latestResult);
			}
		});
	});
}
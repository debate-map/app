import {CreateAccessor} from "mobx-graphlink";
import {GetAccessPolicy} from "../accessPolicies.js";
import {AccessPolicy} from "../accessPolicies/@AccessPolicy.js";
import {APAction, APTable, PermissionSetForType} from "../accessPolicies/@PermissionSet.js";
import {HasAdminPermissions, IsUserCreator, IsUserCreatorOrAdmin, IsUserCreatorOrMod} from "../users/$user.js";
import {Share} from "../shares/@Share.js";
import {User} from "../users/@User.js";
import {Term} from "../terms/@Term.js";
import {Media} from "../media/@Media.js";
import {CommandRun, DMap, GetNode, GetTimeline, MapNodeEdit, NodeL1, NodeLink, NodePhrasing, NodeRating, NodeRevision, NodeTag, Notification, Subscription, Timeline, TimelineStep} from "../../DB.js";

// sync:rs
export const DoPoliciesAllowX = CreateAccessor((actor_id: string | n, policy_targets: string[] | n, action: APAction)=>{
	if (!policy_targets) return false;
	if (policy_targets.length == 0) return false;

	for (const policyTarget of policy_targets) {
		const [policy_id, table] = policyTarget.split(":");
		if (DoesPolicyAllowX(actor_id, policy_id, table as APTable, action)) {
			return true;
		}
	}
	return false;
});

// sync:rs
export const DoesPolicyAllowX = CreateAccessor((actor_id: string | n, policy_id: string | n, table: APTable, action: APAction)=>{
	const policy = GetAccessPolicy(policy_id);
	if (policy == null) return false;

	if (PermissionSetForType.AsBool(policy.permissions[table], action)
		&& PermissionSetForType.AsBool(AccessPolicy.PermissionExtendsForUserAndTable(policy, actor_id, table), action) != false) {
		return true;
	}
	if (PermissionSetForType.AsBool(AccessPolicy.PermissionExtendsForUserAndTable(policy, actor_id, table), action) == true) {
		return true;
	}
	return false;
});

const CanAccessAccessPolicy = (user_id: string|n, policy: AccessPolicy)=>true;
const CanModifyAccessPolicy = (user_id: string|n, policy: AccessPolicy)=>CanAccessAccessPolicy(user_id, policy) && IsUserCreatorOrMod(user_id, policy);
const CanDeleteAccessPolicy = (user_id: string|n, policy: AccessPolicy)=>CanAccessAccessPolicy(user_id, policy) && IsUserCreatorOrMod(user_id, policy);

const CanAccessShare = (user_id: string|n, share: Share)=>true;
const CanModifyShare = (user_id: string|n, share: Share)=>IsUserCreatorOrMod(user_id, share);
const CanDeleteShare = (user_id: string|n, share: Share)=>IsUserCreatorOrMod(user_id, share);

const CanAccessUser = (user_id: string|n, user: User)=>true;
const CanModifyUser = (user_id: string|n, user: User)=>HasAdminPermissions(user_id);
// const CanDeleteUser = (user_id: string|n,user: User)=>HasAdminPermissions(user_id); account deletion not possible atm

const CanAccessMap = (user_id: string|n, map: DMap)=>{
	return IsUserCreatorOrAdmin(user_id, map) || DoesPolicyAllowX(user_id, map.accessPolicy, APTable.maps, APAction.access);
};
const CanModifyMap = (user_id: string|n, map: DMap)=>{
	return CanAccessMap(user_id, map) && (IsUserCreatorOrMod(user_id, map) || DoesPolicyAllowX(user_id, map.accessPolicy, APTable.maps, APAction.modify));
};
const CanDeleteMap = (user_id: string|n, map: DMap)=>{
	return CanAccessMap(user_id, map) && (IsUserCreatorOrMod(user_id, map) || DoesPolicyAllowX(user_id, map.accessPolicy, APTable.maps, APAction.delete));
};

const CanAccessMedia = (user_id: string|n, media: Media|n)=>{
	if (!media) return false;
	return IsUserCreatorOrAdmin(user_id, media) || DoesPolicyAllowX(user_id, media.accessPolicy, APTable.medias, APAction.access);
};
const CanModifyMedia = (user_id: string|n, media: Media|n)=>{
	if (!media) return false;
	return CanAccessMedia(user_id, media) && (IsUserCreatorOrMod(user_id, media) || DoesPolicyAllowX(user_id, media.accessPolicy, APTable.medias, APAction.modify));
};
const CanDeleteMedia = (user_id: string|n, media: Media|n)=>{
	if (!media) return false;
	return CanAccessMedia(user_id, media) && (IsUserCreatorOrMod(user_id, media) || DoesPolicyAllowX(user_id, media.accessPolicy, APTable.medias, APAction.delete));
};

const CanAccessNode = (user_id: string|n, node: NodeL1|n)=>{
	if (!node) return false;
	return IsUserCreatorOrAdmin(user_id, node) || DoesPolicyAllowX(user_id, node.accessPolicy, APTable.nodes, APAction.access);
};
const CanModifyNode = (user_id: string|n, node: NodeL1|n)=>{
	if (!node) return false;
	return CanAccessNode(user_id, node) && (IsUserCreatorOrMod(user_id, node) || DoesPolicyAllowX(user_id, node.accessPolicy, APTable.nodes, APAction.modify));
};
const CanDeleteNode = (user_id: string|n, node: NodeL1|n)=>{
	if (!node) return false;
	return CanAccessNode(user_id, node) && (IsUserCreatorOrMod(user_id, node) || DoesPolicyAllowX(user_id, node.accessPolicy, APTable.nodes, APAction.delete));
};
const CanAddChildNode = (user_id: string|n, node: NodeL1)=>{
	return CanAccessNode(user_id, node) && (IsUserCreatorOrMod(user_id, node) || DoesPolicyAllowX(user_id, node.accessPolicy, APTable.nodes, APAction.addChild));
};
const CanAddPhrasingNode = (user_id: string|n, node: NodeL1)=>{
	return CanAccessNode(user_id, node) && (IsUserCreatorOrMod(user_id, node) || DoesPolicyAllowX(user_id, node.accessPolicy, APTable.nodes, APAction.addPhrasing));
};
const CanVoteNode = (user_id: string|n, node: NodeL1)=>{
	return CanAccessNode(user_id, node) && (IsUserCreatorOrMod(user_id, node) || DoesPolicyAllowX(user_id, node.accessPolicy, APTable.nodes, APAction.vote));
};

const CanAccessTerm = (user_id: string|n, term: Term)=>{
	return IsUserCreatorOrAdmin(user_id, term) || DoesPolicyAllowX(user_id, term.accessPolicy, APTable.terms, APAction.access);
};
const CanModifyTerm = (user_id: string|n, term: Term)=>{
	return CanAccessTerm(user_id, term) && (IsUserCreatorOrMod(user_id, term) || DoesPolicyAllowX(user_id, term.accessPolicy, APTable.terms, APAction.modify));
};
const CanDeleteTerm = (user_id: string|n, term: Term)=>{
	return CanAccessTerm(user_id, term) && (IsUserCreatorOrMod(user_id, term) || DoesPolicyAllowX(user_id, term.accessPolicy, APTable.terms, APAction.delete));
};

const CanAccessTimeline = (user_id: string|n, timeline: Timeline|n)=>{
	if (!timeline) return false;
	return IsUserCreatorOrAdmin(user_id, timeline) || DoesPolicyAllowX(user_id, timeline.accessPolicy, APTable.others, APAction.access);
};
const CanModifyTimeline = (user_id: string|n, timeline: Timeline|n)=>{
	if (!timeline) return false;
	return CanAccessTimeline(user_id, timeline) && (IsUserCreatorOrMod(user_id, timeline) || DoesPolicyAllowX(user_id, timeline.accessPolicy, APTable.others, APAction.modify));
};
const CanDeleteTimeline = (user_id: string|n, timeline: Timeline|n)=>{
	if (!timeline) return false;
	return CanAccessTimeline(user_id, timeline) && (IsUserCreatorOrMod(user_id, timeline) || DoesPolicyAllowX(user_id, timeline.accessPolicy, APTable.others, APAction.delete));
};

const CanAccessNodeLink = (user_id: string|n, nodeLink: NodeLink)=>{
	return IsUserCreatorOrAdmin(user_id, nodeLink) || DoPoliciesAllowX(user_id, nodeLink.c_accessPolicyTargets, APAction.access);
};
const CanModifyNodeLink = (user_id: string|n, nodeLink: NodeLink)=>{
	const child = GetNode(nodeLink.child);
	return IsUserCreatorOrMod(user_id, nodeLink) || (child && CanModifyNode(user_id, child));
};
const CanDeleteNodeLink = (user_id: string|n, nodeLink: NodeLink)=>{
	const child = GetNode(nodeLink.child);
	return IsUserCreatorOrMod(user_id, nodeLink) || (child && CanDeleteNode(user_id, child));
};

const CanAccessNodePhrasing = (user_id: string|n, nodePhrasing: NodePhrasing)=>{
	return IsUserCreatorOrAdmin(user_id, nodePhrasing) || DoPoliciesAllowX(user_id, nodePhrasing.c_accessPolicyTargets, APAction.access);
};
const CanModifyNodePhrasing = (user_id: string|n, nodePhrasing: NodePhrasing)=>{
	return CanAccessNodePhrasing(user_id, nodePhrasing) && IsUserCreatorOrMod(user_id, nodePhrasing);
};
const CanDeleteNodePhrasing = (user_id: string|n, nodePhrasing: NodePhrasing)=>{
	return CanAccessNodePhrasing(user_id, nodePhrasing) && IsUserCreatorOrMod(user_id, nodePhrasing);
};

const CanAccessNodeRating = (user_id: string|n, nodeRating: NodeRating)=>{
	return IsUserCreatorOrAdmin(user_id, nodeRating) || DoPoliciesAllowX(user_id, nodeRating.c_accessPolicyTargets, APAction.access);
};
const CanModifyNodeRating = (user_id: string|n, nodeRating: NodeRating)=>{
	return CanAccessNodeRating(user_id, nodeRating) && IsUserCreator(user_id, nodeRating);
};
const CanDeleteNodeRating = (user_id: string|n, nodeRating: NodeRating)=>{
	return CanAccessNodeRating(user_id, nodeRating) && IsUserCreator(user_id, nodeRating);
};

const CanAccessNodeRevision = (user_id: string|n, nodeRevision: NodeRevision)=>{
	return IsUserCreatorOrAdmin(user_id, nodeRevision) || DoPoliciesAllowX(user_id, nodeRevision.c_accessPolicyTargets, APAction.access);
};
// const CanModifyNodeRevision = (user_id: string|n,nodeRevision: NodeRevision)=> // Revisions cannot be edited
// const CanDeleteNodeRevision = (user_id: string|n,nodeRevision: NodeRevision)=> 

const CanAccessNodeTag = (user_id: string|n, nodeTag: NodeTag)=>{
	return IsUserCreatorOrAdmin(user_id, nodeTag) || DoPoliciesAllowX(user_id, nodeTag.c_accessPolicyTargets, APAction.access);
};
const CanModifyNodeTag = (user_id: string|n, nodeTag: NodeTag)=>{
	return CanAccessNodeTag(user_id, nodeTag) && IsUserCreatorOrMod(user_id, nodeTag);
};
const CanDeleteNodeTag = (user_id: string|n, nodeTag: NodeTag)=>{
	return CanAccessNodeTag(user_id, nodeTag) && IsUserCreatorOrMod(user_id, nodeTag);
};

const CanAccessTimelineStep = (user_id: string|n, timelineStep: TimelineStep)=>{
	return IsUserCreatorOrAdmin(user_id, timelineStep) || DoPoliciesAllowX(user_id, timelineStep.c_accessPolicyTargets, APAction.access);
};
const CanModifyTimelineStep = (user_id: string|n, timelineStep: TimelineStep)=>{
	if (!CanAccessTimelineStep(user_id, timelineStep)) return false;
	if (IsUserCreatorOrMod(user_id, timelineStep)) return true;
	const timeline = GetTimeline(timelineStep.timelineID);
	if (!timeline) return false;
	return DoesPolicyAllowX(user_id, timeline.accessPolicy, APTable.others, APAction.modify);
};
const CanDeleteTimelineStep = (user_id: string|n, timelineStep: TimelineStep)=>{
	if (!CanAccessTimelineStep(user_id, timelineStep)) return false;
	if (IsUserCreatorOrMod(user_id, timelineStep)) return true;
	const timeline = GetTimeline(timelineStep.timelineID);
	if (!timeline) return false;
	return DoesPolicyAllowX(user_id, timeline.accessPolicy, APTable.others, APAction.delete);
};

const CanAccessMapNodeEdit = (user_id: string|n, mapNodeEdit: MapNodeEdit)=>{
	return HasAdminPermissions(user_id) || DoPoliciesAllowX(user_id, mapNodeEdit.c_accessPolicyTargets, APAction.access);
};
const CanAccessUserHidden = (user_id: string|n, user: User)=>{
	return HasAdminPermissions(user_id) || user.id === user_id;
};
const CanModifyUserHidden = (user_id: string|n, user: User)=>CanAccessUserHidden(user_id, user) && user.id === user_id;

const CanAccessCommandRun = (user_id: string|n, commandRun: CommandRun)=>{
	return IsUserCreatorOrAdmin(user_id, {creator: commandRun.actor}) || (commandRun.public_base && DoPoliciesAllowX(user_id, commandRun.c_accessPolicyTargets, APAction.access));
};
const CanAccessSubscription = (user_id: string|n, subscription: Subscription)=>{
	return IsUserCreatorOrAdmin(user_id, {creator: subscription.user});
};
const CanAccessNotification = (user_id: string|n, notification: Notification)=>{
	return IsUserCreatorOrAdmin(user_id, {creator: notification.user});
};
const CanModifyNotification = (user_id: string|n, notification: Notification)=>{
	return CanAccessNotification(user_id, notification) && IsUserCreatorOrAdmin(user_id, {creator: notification.user});
};

export const PERMISSIONS = {
    AccessPolicy: {
        Access: CanAccessAccessPolicy,
        Modify: CanModifyAccessPolicy,
        Delete: CanDeleteAccessPolicy,
    },
    Share: {
        Access: CanAccessShare,
        Modify: CanModifyShare,
        Delete: CanDeleteShare,
    },
    User: {
        Access: CanAccessUser,
        Modify: CanModifyUser,
    	// Delete: CanDeleteUser, // Uncomment if user deletion is implemented in the future
    },
    Map: {
        Access: CanAccessMap,
        Modify: CanModifyMap,
        Delete: CanDeleteMap,
    },
    Media: {
        Access: CanAccessMedia,
        Modify: CanModifyMedia,
        Delete: CanDeleteMedia,
    },
    Node: {
        Access: CanAccessNode,
        Modify: CanModifyNode,
        Delete: CanDeleteNode,
        AddChild: CanAddChildNode,
        AddPhrasing: CanAddPhrasingNode,
        Vote: CanVoteNode,
    },
    Term: {
        Access: CanAccessTerm,
        Modify: CanModifyTerm,
        Delete: CanDeleteTerm,
    },
    Timeline: {
        Access: CanAccessTimeline,
        Modify: CanModifyTimeline,
        Delete: CanDeleteTimeline,
    },
    NodeLink: {
        Access: CanAccessNodeLink,
        Modify: CanModifyNodeLink,
        Delete: CanDeleteNodeLink,
    },
    NodePhrasing: {
        Access: CanAccessNodePhrasing,
        Modify: CanModifyNodePhrasing,
        Delete: CanDeleteNodePhrasing,
    },
    NodeRating: {
        Access: CanAccessNodeRating,
        Modify: CanModifyNodeRating,
        Delete: CanDeleteNodeRating,
    },
    NodeRevision: {
        Access: CanAccessNodeRevision,
    	// Modify: CanModifyNodeRevision, // Uncomment if revision modification is allowed
    	// Delete: CanDeleteNodeRevision, // Uncomment if revision deletion is allowed
    },
    NodeTag: {
        Access: CanAccessNodeTag,
        Modify: CanModifyNodeTag,
        Delete: CanDeleteNodeTag,
    },
    TimelineStep: {
        Access: CanAccessTimelineStep,
        Modify: CanModifyTimelineStep,
        Delete: CanDeleteTimelineStep,
    },
    MapNodeEdit: {
        Access: CanAccessMapNodeEdit,
    },
    UserHidden: {
        Access: CanAccessUserHidden,
        Modify: CanModifyUserHidden,
    },
    CommandRun: {
        Access: CanAccessCommandRun,
    },
    Subscription: {
        Access: CanAccessSubscription,
    },
    Notification: {
        Access: CanAccessNotification,
        Modify: CanModifyNotification,
    },
} as const;
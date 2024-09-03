import {CreateAccessor} from "mobx-graphlink";
import {GetAccessPolicy} from "../accessPolicies.js";
import {AccessPolicy} from "../accessPolicies/@AccessPolicy.js";
import {APAction, APTable, PermissionSetForType} from "../accessPolicies/@PermissionSet.js";
import {HasAdminPermissions, IsUserCreatorOrAdmin, IsUserCreatorOrMod} from "../users/$user.js";
import {Share} from "../shares/@Share.js";
import {User} from "../users/@User.js";
import {Term} from "../terms/@Term.js";
import {Media} from "../media/@Media.js";
import {CommandRun, DMap, MapNodeEdit, NodeL1, NodeLink, NodePhrasing, NodeRevision, NodeTag, Notification, Subscription, Timeline, TimelineStep} from "../../DB.js";

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

const CanAccessAccessPolicy = (policy: AccessPolicy, user_id: string)=>true;
const CanAccessShare = (share: Share, user_id: string)=>true;
const CanAccessUser = (user: User, user_id: string)=>true;
// const CanAccessProposal = (propsal: Proposal, user_id: string)=>true;
// const CanAccessUserInfo = (policy: , user_id: string)=>true;
const CanAccessTerm = (term: Term, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, term) || DoesPolicyAllowX(user_id, term.accessPolicy, APTable.terms, APAction.access);
};
const CanAccessMedia = (media: Media, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, media) || DoesPolicyAllowX(user_id, media.accessPolicy, APTable.medias, APAction.access);
};
const CanAccessMap = (map: DMap, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, map) || DoesPolicyAllowX(user_id, map.accessPolicy, APTable.maps, APAction.access);
};
const CanAccessNode = (node: NodeL1, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, node) || DoesPolicyAllowX(user_id, node.accessPolicy, APTable.nodes, APAction.access);
};
const CanAccessTimeline = (timeline: Timeline, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, timeline) || DoesPolicyAllowX(user_id, timeline.accessPolicy, APTable.others, APAction.access);
};
const CanAccessNodeLink = (nodeLink: NodeLink, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, nodeLink) || DoPoliciesAllowX(user_id, nodeLink.c_accessPolicyTargets, APAction.access);
};
const CanAccessNodePhrasing = (nodePhrasing: NodePhrasing, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, nodePhrasing) || DoPoliciesAllowX(user_id, nodePhrasing.c_accessPolicyTargets, APAction.access);
};
const CanAccessNodeRevision = (nodeRevision: NodeRevision, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, nodeRevision) || DoPoliciesAllowX(user_id, nodeRevision.c_accessPolicyTargets, APAction.access);
};
const CanAccessNodeTag = (nodeTag: NodeTag, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, nodeTag) || DoPoliciesAllowX(user_id, nodeTag.c_accessPolicyTargets, APAction.access);
};
const CanAccessTimelineStep = (timelineStep: TimelineStep, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, timelineStep) || DoPoliciesAllowX(user_id, timelineStep.c_accessPolicyTargets, APAction.access);
};
const CanAccessMapNodeEdit = (mapNodeEdit: MapNodeEdit, user_id: string)=>{
	return HasAdminPermissions(user_id) || DoPoliciesAllowX(user_id, mapNodeEdit.c_accessPolicyTargets, APAction.access);
};
const CanAccessUserHidden = (user: User, user_id: string)=>{
	return HasAdminPermissions(user_id) || user.id === user_id;
};
const CanAccessCommandRun = (commandRun: CommandRun, user_id: string)=>{
	return HasAdminPermissions(user_id) || (commandRun.public_base && DoPoliciesAllowX(user_id, commandRun.c_accessPolicyTargets, APAction.access));
};
const CanAccessSubscription = (subscription: Subscription, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, {creator: subscription.user});
};
const CanAccessNotification = (notification: Notification, user_id: string)=>{
	return IsUserCreatorOrAdmin(user_id, {creator: notification.user});
};

export function CanAccess(entity: AccessPolicy, user_id: string): boolean;
export function CanAccess(entity: Share, user_id: string): boolean;
export function CanAccess(entity: User, user_id: string): boolean;
export function CanAccess(entity: Term, user_id: string): boolean;
export function CanAccess(entity: Media, user_id: string): boolean;
export function CanAccess(entity: DMap, user_id: string): boolean;
export function CanAccess(entity: NodeL1, user_id: string): boolean;
export function CanAccess(entity: Timeline, user_id: string): boolean;
export function CanAccess(entity: NodeLink, user_id: string): boolean;
export function CanAccess(entity: NodePhrasing, user_id: string): boolean;
export function CanAccess(entity: NodeRevision, user_id: string): boolean;
export function CanAccess(entity: NodeTag, user_id: string): boolean;
export function CanAccess(entity: TimelineStep, user_id: string): boolean;
export function CanAccess(entity: MapNodeEdit, user_id: string): boolean;
export function CanAccess(entity: CommandRun, user_id: string): boolean;
export function CanAccess(entity: Subscription, user_id: string): boolean;
export function CanAccess(entity: Notification, user_id: string): boolean;

export function CanAccess(entity: any, user_id: string): boolean {
	if (entity instanceof AccessPolicy) {
		return CanAccessAccessPolicy(entity, user_id);
	} if (entity instanceof Share) {
		return CanAccessShare(entity, user_id);
	} if (entity instanceof User) {
		return CanAccessUser(entity, user_id);
	} if (entity instanceof Term) {
		return CanAccessTerm(entity, user_id);
	} if (entity instanceof Media) {
		return CanAccessMedia(entity, user_id);
	} if (entity instanceof DMap) {
		return CanAccessMap(entity, user_id);
	} if (entity instanceof NodeL1) {
		return CanAccessNode(entity, user_id);
	} if (entity instanceof Timeline) {
		return CanAccessTimeline(entity, user_id);
	} if (entity instanceof NodeLink) {
		return CanAccessNodeLink(entity, user_id);
	} if (entity instanceof NodePhrasing) {
		return CanAccessNodePhrasing(entity, user_id);
	} if (entity instanceof NodeRevision) {
		return CanAccessNodeRevision(entity, user_id);
	} if (entity instanceof NodeTag) {
		return CanAccessNodeTag(entity, user_id);
	} if (entity instanceof TimelineStep) {
		return CanAccessTimelineStep(entity, user_id);
	} if (entity instanceof MapNodeEdit) {
		return CanAccessMapNodeEdit(entity, user_id);
	} if (entity instanceof CommandRun) {
		return CanAccessCommandRun(entity, user_id);
	} if (entity instanceof Subscription) {
		return CanAccessSubscription(entity, user_id);
	} if (entity instanceof Notification) {
		return CanAccessNotification(entity, user_id);
	}
	throw new Error("Unsupported entity type");

}
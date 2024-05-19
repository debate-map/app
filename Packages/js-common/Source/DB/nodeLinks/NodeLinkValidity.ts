import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetValues} from "web-vcore/nm/js-vextensions.js";
import {globalRootNodeID} from "../../DB_Constants.js";
import {DoesPolicyAllowX} from "../@Shared/TablePermissions.js";
import {APAction, APTable} from "../accessPolicies/@PermissionSet.js";
import {GetNodeLinks} from "../nodeLinks.js";
import {NodeL1, NodeL2} from "../nodes/@Node.js";
import {NodeType, NodeType_Info} from "../nodes/@NodeType.js";
import {CanGetBasicPermissions, GetUserPermissionGroups, HasAdminPermissions} from "../users/$user.js";
import {User} from "../users/@User.js";
import {GetNode} from "../nodes.js";
import {ChildGroup, Polarity, childGroupsWithPolarity_required, childGroupsWithPolarity_requiredOrOptional} from "./@NodeLink.js";
import {PickOnly} from "../../Utils.js";

/*export function GetValidChildTypes(nodeType: NodeType, path: string, group: ChildGroup, polarity: Polarity|n) {
	const nodeTypes = GetValues(NodeType);
	const validChildTypes = nodeTypes.filter(type=>CheckLinkIsValid(nodeType, type, group, polarity) == null);
	return validChildTypes;
}
export function GetValidNewChildTypes(parent: NodeL2, childGroup: ChildGroup, polarity: Polarity|n, actor: User|n) {
	const nodeTypes = GetValues(NodeType);
	const validChildTypes = nodeTypes.filter(type=>CheckNewLinkIsValid(parent.id, {type} as any, childGroup, polarity, actor) == null);

	// if in relevance or truth group, claims cannot be direct children (must be within argument)
	/*if (childGroup == ChildGroup.relevance || childGroup == ChildGroup.truth) {
		validChildTypes = validChildTypes.Exclude(NodeType.claim);
	} else {
		// in the other cases, arguments cannot be direct children (those are only meant for in relevance/truth groups)
		validChildTypes = validChildTypes.Exclude(NodeType.argument);
	}*#/

	return validChildTypes;
}*/

export class NewChildConfig {
	constructor(data: Omit<NewChildConfig, "FinalChildType">) {
		Object.assign(this, data);
	}
	childGroup: ChildGroup;
	/** Note: If addWrapperArg is true, this actually represents the grandchild-type, ie. type of node being put in the wrapper-argument. */
	childType: NodeType;
	addWrapperArg: boolean;
	/** Note: If addWrapperArg is true, this represents the polarity of the wrapper-argument, rather than than the grandchild. */
	polarity: Polarity|n;

	FinalChildType() {
		return this.addWrapperArg ? NodeType.argument : this.childType;
	}
}
function GetAllNewChildConfigs() {
	const result = [] as NewChildConfig[];
	const nodeTypes = GetValues(NodeType);
	for (const childGroup of GetValues(ChildGroup)) {
		for (const childType of nodeTypes) {
			// filtering based on this array is merely an optimization
			/*const addWrapperArgPossibilities = [false];
			if (polarity != null && childType == NodeType.claim) addWrapperArgPossibilities.push(true);*/
			const addWrapperArgPossibilities = [false, true];

			for (const addWrapperArg of addWrapperArgPossibilities) {
				// filtering based on this array is merely an optimization
				/*const polarityPossibilities: Array<Polarity|n> = [null];
				if (childGroupsWithPolarity_requiredOrOptional.includes(childGroup)) polarityPossibilities.push(Polarity.supporting, Polarity.opposing);*/
				const polarityPossibilities = [null, Polarity.supporting, Polarity.opposing];

				for (const polarity of polarityPossibilities) {
					result.push(new NewChildConfig({childType, childGroup, polarity, addWrapperArg}));
				}
			}
		}
	}
	return result;
}
export const allNewChildConfigs = GetAllNewChildConfigs();

/*export function GetPossiblyValidNewChildConfigs(parentType: NodeType) {
	return allNewChildConfigs.filter(config=>CheckLinkIsValid(parentType, config.childType, config.childGroup, config.polarity) == null);
}*/

export function CheckNewChildConfigUnderParentIsValid(config: NewChildConfig, parentID: string, actor: User|n) {
	// `addWrapperArg` represents functionality beyond what CheckNewLinkIsValid can check; so do the validation for that extra functionality here
	// (more elegant way would be to enable a call to CheckNewLinkIsValid for the wrapperArg->claim link as well, but not possible atm since there's no parent-id resolvable for the wrapper-arg)
	if (config.addWrapperArg) {
		if (config.childType != NodeType.claim) return "Only claims can have wrapper-arguments added for them.";
	}
	return CheckNewLinkIsValid(parentID, null, config.FinalChildType(), config.childGroup, config.polarity, actor);
}
export function GetValidNewChildConfigsUnderParent(parentID: string, actor: User|n) {
	return allNewChildConfigs.filter(config=>CheckNewChildConfigUnderParentIsValid(config, parentID, actor) == null);
}

/** Does basic checking of validity of parent<>child linkage. See `CheckValidityOfNewLink` for a more thorough validation. */
// sync: rs[assert_link_is_valid]
export const CheckLinkIsValid = CreateAccessor((parentType: NodeType, childType: NodeType, childGroup: ChildGroup, linkPolarity: Polarity|n)=>{
	// redundant check, improving error-message clarity for certain issues
	if (!NodeType_Info.for[parentType].childGroup_childTypes.has(childGroup)) {
		return `Where parent's type is ${NodeType[parentType]}, no "${ChildGroup[childGroup]}" child-group exists.`;
	}

	const validChildTypes = NodeType_Info.for[parentType].childGroup_childTypes.get(childGroup) ?? [];
	if (!validChildTypes.includes(childType)) {
		// redundant checks, improving error-message clarity for certain issues
		if (parentType == NodeType.argument && childGroup == ChildGroup.generic && childType != NodeType.claim) {
			return `Where parent is an argument, and child-group is generic, a claim child is expected (instead it's a ${NodeType[childType]}).`;
		}
		const isSLSimpleArg = parentType == NodeType.claim && childType == NodeType.claim && childGroup == ChildGroup.truth && linkPolarity != null;
		if (!isSLSimpleArg && childGroupsWithPolarity_required.includes(childGroup) && childType != NodeType.argument) {
			return `Where child-group is ${childGroup}, an argument child is expected (instead it's a ${NodeType[childType]}).`;
		}

		// give generic message
		return `The child's type (${NodeType[childType]}) is not valid here. (parent type: ${NodeType[parentType]}, child group: ${ChildGroup[childGroup]})`;
	}

	if (childGroupsWithPolarity_required.includes(childGroup)) {
		if (linkPolarity == null) return `A link in group "truth", "relevance", or "neutrality" must have a polarity specified.`;
	}
	if (childType == NodeType.argument) {
		if (linkPolarity == null) return "A link with an argument child must have a polarity specified.";
	}
	if (linkPolarity != null) {
		if (!childGroupsWithPolarity_requiredOrOptional.includes(childGroup)) return `Only links in child-group "truth", "relevance", "neutrality", or "freeform" can have a polarity specified.`;
		if (!(childType == NodeType.argument || childType == NodeType.claim)) return "Only links with an argument child (or claim child, in sl-mode) can have a polarity specified.";
	}
});
/**
 * Extension of `CheckValidityOfLink`, with additional checking based on knowledge of specific nodes being linked, user's permissions, etc.
 * For example:
 * * Blocks if node is being linked as child of itself.
 * * Blocks if adding child to global-root, without user being an admin.
 * */
// sync: rs[assert_new_link_is_valid]
export const CheckNewLinkIsValid = CreateAccessor((parentID: string, newChildID: string|null, newChildType: NodeType, newChildGroup: ChildGroup, newLinkPolarity: Polarity|n, actor: User|n)=>{
	const permissions = GetUserPermissionGroups(actor?.id);
	if (!CanGetBasicPermissions(permissions)) return "You're not signed in, or lack basic permissions.";

	const parent = GetNode(parentID);
	if (parent == null) return "Parent data not found.";
	//if (!) { return "Parent node's permission policy does not grant you the ability to add children."; }
	const guessedCanAddChild = actor
		? NodeL1.canAddChild(parent, actor) // if can add child
		: DoesPolicyAllowX(null, parent.accessPolicy, APTable.nodes, APAction.addChild); // or probably can
	if (!guessedCanAddChild) { return "Parent node's permission policy does not grant you the ability to add children."; }

	// const parentPathIDs = SplitStringBySlash_Cached(parentPath).map(a => a.ToInt());
	// if (map.name == "Global" && parentPathIDs.length == 1) return false; // if parent is l1(root), don't accept new children
	if (parent.id == globalRootNodeID && !HasAdminPermissions(permissions)) return "Only admins can add children to the global-root.";
	// if in global map, parent is l2, and user is not a mod (and not node creator), don't accept new children
	// if (parentPathIDs[0] == globalRootNodeID && parentPathIDs.length == 2 && !HasModPermissions(permissions) && parent.creator != MeID()) return false;
	if (parent.id == newChildID) return "Cannot link node as its own child.";

	const parentChildLinks = GetNodeLinks(parentID, null, newChildGroup); // query it with "childID" null, so it's cached once for all such calls
	const isAlreadyChild = parentChildLinks.Any(a=>a.child == newChildID);

	// if new-holder-type is not specified, consider "any" and so don't check
	/*if (newChildGroup !== undefined) {
		const currentChildGroup = GetChildGroup(newChild.type, parent.type);
		if (isAlreadyChild && currentChildGroup == newChildGroup) return "Node is already a child of the parent."; // if already a child of this parent, reject (unless it's a claim, in which case allow, as can be)
	}*/
	if (isAlreadyChild) return "Node is already a child of the parent.";

	return CheckLinkIsValid(parent.type, newChildType, newChildGroup, newLinkPolarity);
});
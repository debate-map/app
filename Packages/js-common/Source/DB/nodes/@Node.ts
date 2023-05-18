import {GetValues_ForSchema, CE, IsNumberString, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddAJVExtraCheck, AddSchema, DB, MGLClass, Field, GetSchemaJSON_Cloned, UUID, UUID_regex, UUID_regex_partial} from "web-vcore/nm/mobx-graphlink.js";
import {PickOnly} from "../../Utils/General/General.js";
import {DoesPolicyAllowX} from "../@Shared/TablePermissions.js";
import {GetAccessPolicy} from "../accessPolicies.js";
import {AccessPolicy} from "../accessPolicies/@AccessPolicy.js";
import {APAction, APTable} from "../accessPolicies/@PermissionSet.js";
import {NodeLink} from "../nodeLinks/@NodeLink.js";
import {IsUserCreator, IsUserCreatorOrMod} from "../users/$user.js";
import {User} from "../users/@User.js";
import {ArgumentType, NodeRevision} from "./@NodeRevision.js";
import {NodeType} from "./@NodeType.js";

export enum ClaimForm {
	base = "base",
	negation = "negation",
	question = "question",
}
//export type ClaimForm = typeof ClaimForm_values[number];
AddSchema("ClaimForm", {enum: GetValues(ClaimForm)});

//export const NodeL1_id = UUID_regex;
//export const NodeL1_chainAfterFormat = "^(\\[start\\]|[0-9]+)$";

/**
 * Why is this called "NodeL1" rather than just "Node" (as seen in Rust app-server)?
 * Primary reason: "Node" conflicts with js global by same name.
 * Secondary reason: "NodeL1" name matches with the "NodeL2" and "NodeL3" types.
*/
@MGLClass({table: "nodes"}, undefined, t=>{
	//t.comment("@name NodeL1"); // avoids conflict with the default "Node" type that Postgraphile defines for Relay
})
export class NodeL1 {
	constructor(initialData: {type: NodeType} & Partial<NodeL1>) {
		CE(this).VSet(initialData);
	}

	// cannot be modified
	// ==========

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "NodeType"})
	type: NodeType;

	// cannot be modified manually, but entry will become null if the map is deleted
	@DB((t, n)=>t.text(n).nullable().references("id").inTable(`maps`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	rootNodeForMap?: string;

	// cannot be modified manually, but entry will be updated to the id of the latest revision
	@DB((t, n)=>t.text(n).references("id").inTable(`nodeRevisions`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	c_currentRevision: string;

	// modifiable if: 1) node's access-policy is not "public ungoverned", or 2) minimal # of users have built upon node, eg. added revisions or children [# depends on user rep]
	// (these are left out of node-revisions because they are "structural", ie. node-revisions are for node-internal changes, whereas the below affect the approach taken for adding children and such)
	// ==========

	@DB((t, n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	// todo: remove this field eventually, since no longer in use (in rust code as well, along with the set_node_is_multi_premise command)
	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"}, {opt: true})
	multiPremiseArgument?: boolean;

	@DB((t, n)=>t.text(n).nullable())
	@Field({$ref: "ArgumentType"}, {opt: true})
	argumentType?: ArgumentType;

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: "Node_Extras"})
	extras = new Node_Extras();

	static canAddChild(self: NodeL1, actor: User) {
		//if (!can_access(actor, self)) { return false; }
		return IsUserCreatorOrMod(actor.id, self) || DoesPolicyAllowX(actor.id, self.accessPolicy, APTable.nodes, APAction.addChild);
	}
}
AddSchema("Node_Partial", ["NodeL1"], ()=>{
	const schema = GetSchemaJSON_Cloned("NodeL1");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = ["type"];
	return schema;
});
// disabled for now, simply because we haven't finished making all places that manipulate "NodeL1.children" reliably update "NodeL1.childrenOrder" as well
/*AddAJVExtraCheck('NodeL1', (node: NodeL1) => {
	if (node.type == NodeType.Argument) {
		if ((node.childrenOrder ? node.childrenOrder.length : 0) !== (node.children ? node.children.VKeys().length : 0)) {
			return 'Children and childrenOrder lengths differ!';
		}
	}
});*/

//export type NodeL1_NoExtras = Omit<NodeL1, "extras"> & {extras: never};
//export type NodeL1Input = Pick<NodeL1, "accessPolicy" | "type" | "rootNodeForMap" | "multiPremiseArgument" | "argumentType">;
export const NodeL1Input_keys = ["accessPolicy", "type", "rootNodeForMap", "multiPremiseArgument", "argumentType"] as const;
export type NodeL1Input = PickOnly<NodeL1, typeof NodeL1Input_keys[number]>;
export const AsNodeL1Input = (node: NodeL1)=>node.IncludeKeys(...NodeL1Input_keys) as NodeL1Input;

@MGLClass()
export class Node_Extras {
	constructor(data?: Partial<Node_Extras>) {
		Object.assign(this, data);
	}

	@Field({
		$gqlType: "JSON", // graphql doesn't support key-value-pair structures, so just mark as JSON
		patternProperties: {".+": {$ref: "RatingSummary"}},
	}, {opt: true})
	ratingSummaries? = {} as {[key: string]: RatingSummary}; // derived from "nodeRatings" table
}
@MGLClass()
export class RatingSummary {
	constructor(data?: Partial<RatingSummary>) {
		Object.assign(this, data);
	}

	//declare _key: string; // rating-type

	@Field({type: ["number", "null"]})
	average: number|n;

	@Field({items: {type: "number"}})
	countsByRange: number[];
}

// helpers
// export type NodeL2 = NodeL1 & {finalType: NodeType};
/** NodeL1, except with the access-policy and current-revision data attached. (no view-related stuff) */
export interface NodeL2 extends NodeL1 {
	// todo: maybe make-so these added/attached cached-data properties have "_" at the start of their name, to make them easier to recognize
	policy: AccessPolicy;
	current: NodeRevision;
}
/** NodeL2, except with some view-related stuff included. (eg. display-polarity based on path, current lens) */
export interface NodeL3 extends NodeL2 {
	/** For this node (with the given ancestors): How the node would be displayed -- "supporting" being green, "opposing" being red. */
	displayPolarity: Polarity;
	link: NodeLink|n;
	//linkToParent: ChildEntry;
	//parentLinkToGrandParent: ChildEntry;
}
export type NodeL3_Argument = NodeL3 & Required<Pick<NodeL3, "argumentType" | "multiPremiseArgument">>;

/*export enum Polarity {
	Supporting = 10,
	Opposing = 20,
}
AddSchema("Polarity", {enum: GetValues(Polarity)});*/
/*export const Polarity_values = ["supporting", "opposing"] as const;
export type Polarity = typeof Polarity_values[number];
AddSchema("Polarity", {oneOf: Polarity_values});*/

export enum Polarity {
	supporting = "supporting",
	opposing = "opposing",
}
//export type Polarity = typeof Polarity_values[number];
AddSchema("Polarity", {enum: GetValues(Polarity)});
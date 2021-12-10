import {GetAsync, Command, AssertV, dbp, CommandMeta, DBHelper, SimpleSchema, DeriveJSONSchema} from "web-vcore/nm/mobx-graphlink.js";
import {E} from "js-vextensions";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {LinkNode_HighLevel} from "./LinkNode_HighLevel.js";
import {ClaimForm, Polarity, MapNode} from "../DB/nodes/@MapNode.js";
import {GetNode} from "../DB/nodes.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {AddArgumentAndClaim, AddChildNode} from "../Commands.js";

/*declare global {
	interface Object {
		Is<T>(type: new(..._)=>T): NonNullable<T>;
	}
}*/

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		mapID: {$ref: "UUID"},
		$link: DeriveJSONSchema(NodeChildLink, {makeOptional_all: true, makeRequired: ["parent", "child", "group"]}),
	}),
	returnSchema: ()=>SimpleSchema({
		$linkID: {type: "string"},
	}),
})
export class LinkNode extends Command<{mapID: string|n, link: RequiredBy<Partial<NodeChildLink>, "parent" | "child" | "group">}, {linkID: string}> {
	child_oldData: MapNode|n;
	parent_oldData: MapNode;
	Validate() {
		this.payload.link = E(new NodeChildLink(), this.payload.link); // for props the caller didn't specify, but which have default values, use them
		const {link} = this.payload;
		AssertV(link.parent != link.child, "Parent-id and child-id cannot be the same!");

		this.child_oldData =
			this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this)?.payload.node
			?? GetNode(link.child);
		AssertV(this.child_oldData, "Cannot link child-node that does not exist!");
		this.parent_oldData =
			this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this)?.Up(AddArgumentAndClaim)?.Check(a=>a.sub_addClaim == this.up)?.payload.argumentNode
			?? this.Up(LinkNode_HighLevel)?.Check(a=>a.sub_linkToNewParent == this)?.sub_addArgumentWrapper?.payload.node
			//?? (this.parentCommand instanceof ImportSubtree_Old ? "" as any : null) // hack; use empty-string to count as non-null for this chain, but count as false for if-statements (ye...)
			?? GetNode.NN(link.parent);
		AssertV(this.parent_oldData, "Cannot link child-node to parent that does not exist!");

		const parentToChildLinks =
			(this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this) ? [] : null)
			?? GetNodeChildLinks(link.parent, link.child);
		AssertV(parentToChildLinks.length == 0, `Node #${link.child} is already a child of node #${link.parent}.`);

		link.id = this.GenerateUUID_Once("link.id");
		link.creator = this.userInfo.id;
		link.createdAt = Date.now();
		link.c_parentType = this.parent_oldData.type;
		link.c_childType = this.child_oldData.type;
		if (this.child_oldData.type == MapNodeType.argument) {
			AssertV(this.payload.link.polarity != null, "An argument node must have its polarity specified in its parent-link.");
		}

		this.returnData = {linkID: link.id};
	}

	DeclareDBUpdates(db: DBHelper) {
		db.set(dbp`nodeChildLinks/${this.payload.link.id!}`, this.payload.link);
	}
}
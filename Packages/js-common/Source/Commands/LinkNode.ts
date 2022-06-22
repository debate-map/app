import {E} from "js-vextensions";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {AddArgumentAndClaim, AddChildNode} from "../Commands.js";
import {GetNodeChildLinks} from "../DB/nodeChildLinks.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {CheckValidityOfLink, GetNode} from "../DB/nodes.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {LinkNode_HighLevel} from "./LinkNode_HighLevel.js";
import {TransferNodes} from "./TransferNodes.js";

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
export class LinkNode extends Command<{mapID: string|n, link: RequiredBy<Partial<NodeChildLink>, "parent" | "child" | "group" | "orderKey">}, {linkID: string}> {
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
			?? this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this)?.Up(TransferNodes)?.Check(a=>a.transferData[1]?.addNodeCommand == this.up)?.transferData[0].addNodeCommand?.payload.node
			?? GetNode.NN(link.parent);
		AssertV(this.parent_oldData, "Cannot link child-node to parent that does not exist!");

		const parentToChildLinks =
			(this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this) ? [] : null)
			?? GetNodeChildLinks(link.parent, link.child);
		AssertV(parentToChildLinks.length == 0, `Node #${link.child} is already a child of node #${link.parent}.`);

		// confirm that the parent-child combination is valid
		//const forNewLink_error = ForNewLink_GetError(link.parent); // can't use this atm, since not "pure" enough
		const forLink_error = CheckValidityOfLink(this.parent_oldData.type, link.group, this.child_oldData.type);
		AssertV(forLink_error == null, forLink_error);

		link.id = this.GenerateUUID_Once("link.id");
		link.creator = this.userInfo.id;
		link.createdAt = Date.now();
		link.c_parentType = this.parent_oldData.type;
		link.c_childType = this.child_oldData.type;
		if (this.child_oldData.type == MapNodeType.argument) {
			AssertV(this.payload.link.polarity != null, "An argument node must have its polarity specified in its parent-link.");
		} else {
			AssertV(this.payload.link.polarity == null, "Only argument nodes should have a polarity value specified in its parent-link.");
		}

		this.returnData = {linkID: link.id};
		AssertValidate("NodeChildLink", link, "Node-child-link invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		db.set(dbp`nodeChildLinks/${this.payload.link.id!}`, this.payload.link);
	}
}
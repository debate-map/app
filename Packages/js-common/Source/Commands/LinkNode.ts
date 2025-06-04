import {E} from "js-vextensions";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, SimpleSchema} from "mobx-graphlink";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {AddArgumentAndClaim, AddChildNode} from "../Commands.js";
import {GetNodeLinks} from "../DB/nodeLinks.js";
import {NodeLink} from "../DB/nodeLinks/@NodeLink.js";
import {GetNode} from "../DB/nodes.js";
import {NodeL1} from "../DB/nodes/@Node.js";
import {NodeType} from "../DB/nodes/@NodeType.js";
import {LinkNode_HighLevel} from "./LinkNode_HighLevel.js";
import {TransferNodes} from "./TransferNodes.js";
import {CheckLinkIsValid} from "../DB/nodeLinks/NodeLinkValidity.js";

/*declare global {
	interface Object {
		Is<T>(type: new(..._)=>T): NonNullable<T>;
	}
}*/

@MapEdit
@UserEdit
@CommandMeta({
	inputSchema: ()=>SimpleSchema({
		mapID: {$ref: "UUID"},
		$link: DeriveJSONSchema(NodeLink, {makeOptional_all: true, makeRequired: ["parent", "child", "group"]}),
	}),
	responseSchema: ()=>SimpleSchema({
		$linkID: {type: "string"},
	}),
})
export class LinkNode extends Command<{mapID?: string|n, link: RequiredBy<Partial<NodeLink>, "parent" | "child" | "group" | "orderKey">}, {linkID: string}> {
	child_oldData: NodeL1|n;
	parent_oldData: NodeL1;
	Validate() {
		this.input.link = E(new NodeLink(), this.input.link); // for props the caller didn't specify, but which have default values, use them
		const {link} = this.input;
		AssertV(link.parent != link.child, "Parent-id and child-id cannot be the same!");

		this.child_oldData =
			this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this)?.input.node
			?? GetNode(link.child);
		AssertV(this.child_oldData, "Cannot link child-node that does not exist!");
		this.parent_oldData =
			this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this)?.Up(AddArgumentAndClaim)?.Check(a=>a.sub_addClaim == this.up)?.input.argumentNode
			?? this.Up(LinkNode_HighLevel)?.Check(a=>a.sub_linkToNewParent == this)?.sub_addArgumentWrapper?.input.node
			//?? (this.parentCommand instanceof ImportSubtree_Old ? "" as any : null) // hack; use empty-string to count as non-null for this chain, but count as false for if-statements (ye...)
			?? this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this)?.Up(TransferNodes)?.Check(a=>a.transferData[1]?.addNodeCommand == this.up)?.transferData[0].addNodeCommand?.input.node
			?? this.Up(TransferNodes)?.Check(a=>a.transferData[0]?.linkChildCommands.includes(this))?.transferData[0].addNodeCommand?.input.node
			?? this.Up(TransferNodes)?.Check(a=>a.transferData[1]?.linkChildCommands.includes(this))?.transferData[1].addNodeCommand?.input.node
			?? this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this)?.parent_oldData
			?? GetNode.NN(link.parent);
		AssertV(this.parent_oldData, "Cannot link child-node to parent that does not exist!");

		const parentToChildLinks =
			(this.Up(AddChildNode)?.Check(a=>a.sub_addLink == this) ? [] : null)
			?? GetNodeLinks(link.parent, link.child);
		AssertV(parentToChildLinks.length == 0, `Node #${link.child} is already a child of node #${link.parent}.`);

		// confirm that the parent-child combination is valid
		//const forNewLink_error = ForNewLink_GetError(link.parent); // can't use this atm, since not "pure" enough
		const forLink_error = CheckLinkIsValid(this.parent_oldData.type, this.child_oldData.type, link.group, link.polarity);
		AssertV(forLink_error == null, forLink_error);

		link.id = this.GenerateUUID_Once("link.id");
		link.creator = this.userInfo.id;
		link.createdAt = Date.now();
		link.c_parentType = this.parent_oldData.type;
		link.c_childType = this.child_oldData.type;
		if (this.child_oldData.type == NodeType.argument) {
			AssertV(this.input.link.polarity != null, "An argument node must have its polarity specified in its parent-link.");
		} else {
			AssertV(this.input.link.polarity == null, "Only argument nodes should have a polarity value specified in its parent-link.");
		}

		this.response = {linkID: link.id};
		AssertValidate("NodeLink", link, "Node-child-link invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		db.set(dbp`nodeLinks/${this.input.link.id!}`, this.input.link);
	}
}
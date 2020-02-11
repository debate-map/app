var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { E } from "js-vextensions";
import { MergeDBUpdates, Command, AssertV } from "mobx-firelink";
import { AssertValidate } from "mobx-firelink";
import { MapEdit, UserEdit } from "../CommandMacros";
import { AddNode } from "./AddNode";
import { Polarity } from "../Store/firebase/nodes/@MapNode";
import { MapNodeType } from "../Store/firebase/nodes/@MapNodeType";
import { GetNode } from "../Store/firebase/nodes";
let AddChildNode = class AddChildNode extends Command {
    Validate() {
        var _a;
        AssertValidate({
            properties: {
                mapID: { type: "string" }, parentID: { type: ["null", "string"] }, node: { $ref: "MapNode_Partial" }, revision: { $ref: "MapNodeRevision_Partial" }, link: { $ref: "ChildEntry" }, asMapRoot: { type: "boolean" },
            },
            required: ["mapID", "parentID", "node", "revision"],
        }, this.payload, "Payload invalid");
        const { mapID, parentID, node, revision, link, asMapRoot } = this.payload;
        AssertV(node.parents == null, "node.parents must be empty. Instead, supply a parentID property in the payload.");
        const node_withParents = E(node, parentID ? { parents: { [parentID]: { _: true } } } : {});
        this.sub_addNode = (_a = this.sub_addNode, (_a !== null && _a !== void 0 ? _a : new AddNode({ mapID, node: node_withParents, revision }).MarkAsSubcommand(this)));
        // this.sub_addNode.VSet({ lastNodeID_addAmount: this.lastNodeID_addAmount, lastNodeRevisionID_addAmount: this.lastNodeRevisionID_addAmount });
        this.sub_addNode.Validate();
        this.payload.link = (link !== null && link !== void 0 ? link : E({ _: true }, node.type == MapNodeType.Argument && { polarity: Polarity.Supporting }));
        if (node.type == MapNodeType.Argument) {
            AssertV(this.payload.link.polarity != null, "An argument node must have its polarity specified in its parent-link.");
        }
        if (!asMapRoot && this.parentCommand == null) {
            // this.parent_oldChildrenOrder = await GetDataAsync('nodes', parentID, '.childrenOrder') as number[];
            this.parent_oldData = GetNode(parentID);
        }
        this.returnData = {
            nodeID: this.sub_addNode.nodeID,
            revisionID: this.sub_addNode.sub_addRevision.revisionID,
        };
    }
    GetDBUpdates() {
        const { parentID, link, asMapRoot } = this.payload;
        const updates = this.sub_addNode.GetDBUpdates();
        const newUpdates = {};
        // add as child of parent
        if (!asMapRoot) {
            newUpdates[`nodes/${parentID}/.children/.${this.sub_addNode.nodeID}`] = link;
            // if this node is being placed as a child of an argument, update the argument's children-order property
            if (this.parent_oldData && this.parent_oldData.type == MapNodeType.Argument) {
                newUpdates[`nodes/${parentID}/.childrenOrder`] = (this.parent_oldData.childrenOrder || []).concat([this.sub_addNode.nodeID]);
            }
        }
        return MergeDBUpdates(updates, newUpdates);
    }
};
AddChildNode = __decorate([
    MapEdit,
    UserEdit
], AddChildNode);
export { AddChildNode };

import { MergeDBUpdates, Command } from "mobx-firelink";
import { AssertValidate } from "mobx-firelink";
import { AddChildNode } from "./AddChildNode";
export class AddArgumentAndClaim extends Command {
    Validate() {
        var _a, _b;
        AssertValidate({
            properties: {
                mapID: { type: "string" },
                argumentParentID: { type: "string" }, argumentNode: { $ref: "MapNode_Partial" }, argumentRevision: { $ref: "MapNodeRevision_Partial" }, argumentLink: { $ref: "ChildEntry" },
                claimNode: { $ref: "MapNode_Partial" }, claimRevision: { $ref: "MapNodeRevision_Partial" }, claimLink: { $ref: "ChildEntry" },
            },
            required: ["mapID", "argumentParentID", "argumentNode", "argumentRevision", "claimNode", "claimRevision"],
        }, this.payload, "Payload invalid");
        const { mapID, argumentParentID, argumentNode, argumentRevision, argumentLink, claimNode, claimRevision, claimLink } = this.payload;
        this.sub_addArgument = (_a = this.sub_addArgument, (_a !== null && _a !== void 0 ? _a : new AddChildNode({
            mapID, parentID: argumentParentID, node: argumentNode, revision: argumentRevision, link: argumentLink,
        }).MarkAsSubcommand(this)));
        this.sub_addArgument.Validate();
        this.sub_addClaim = (_b = this.sub_addClaim, (_b !== null && _b !== void 0 ? _b : new AddChildNode({ mapID, parentID: this.sub_addArgument.returnData.nodeID, node: claimNode, revision: claimRevision, link: claimLink }).MarkAsSubcommand(this)));
        /* this.sub_addClaim.lastNodeID_addAmount = 1;
        this.sub_addClaim.lastNodeRevisionID_addAmount = 1; */
        this.sub_addClaim.Validate();
        this.sub_addClaim.parent_oldData = argumentNode; // we need to do this so add-claim sub knows it's child of argument, and thus updates the children-order prop of the argument
        this.returnData = {
            argumentNodeID: this.sub_addArgument.sub_addNode.nodeID,
            argumentRevisionID: this.sub_addArgument.sub_addNode.sub_addRevision.revisionID,
            claimNodeID: this.sub_addClaim.sub_addNode.nodeID,
            claimRevisionID: this.sub_addClaim.sub_addNode.sub_addRevision.revisionID,
        };
    }
    GetDBUpdates() {
        let updates = {};
        updates = MergeDBUpdates(updates, this.sub_addArgument.GetDBUpdates());
        updates = MergeDBUpdates(updates, this.sub_addClaim.GetDBUpdates());
        return updates;
    }
}

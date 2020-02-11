import { AssertV, AssertValidate, AssertValidate_Full, Command, GenerateUUID, GetSchemaJSON, MergeDBUpdates } from "mobx-firelink";
import { AddNodeRevision } from "./AddNodeRevision";
import { CE } from "js-vextensions";
/** Do not use this from client-side code. This is only to be used internally, by higher-level commands -- usually AddChildNode. */
export class AddNode extends Command {
    Validate() {
        var _a, _b;
        const { mapID, node, revision } = this.payload;
        AssertV(node.currentRevision == null || node.currentRevision == this.sub_addRevision.revisionID, "Cannot specify node's revision-id. It will be generated automatically.");
        AssertV(revision.node == null || revision.node == this.nodeID, "Cannot specify revision's node-id. It will be generated automatically.");
        // this.nodeID = (await GetDataAsync('general', 'data', '.lastNodeID') as number) + this.lastNodeID_addAmount + 1;
        this.nodeID = (_a = this.nodeID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        node.creator = this.userInfo.id;
        node.createdAt = Date.now();
        revision.node = this.nodeID;
        this.sub_addRevision = (_b = this.sub_addRevision, (_b !== null && _b !== void 0 ? _b : new AddNodeRevision({ mapID, revision }).MarkAsSubcommand(this)));
        // this.sub_addRevision.lastNodeRevisionID_addAmount = this.lastNodeRevisionID_addAmount;
        this.sub_addRevision.Validate();
        node.currentRevision = this.sub_addRevision.revisionID;
        // if sub of AddChildNode for new argument, ignore the "childrenOrder" prop requirement (gets added by later link-impact-node subcommand)
        if (this.parentCommand) {
            const mapNodeSchema = GetSchemaJSON("MapNode").Excluding("allOf");
            AssertValidate_Full(mapNodeSchema, "MapNode", node, "Node invalid");
        }
        else {
            AssertValidate("MapNode", node, "Node invalid");
        }
    }
    GetDBUpdates() {
        const { node } = this.payload;
        let updates = {};
        // add node
        // updates['general/data/.lastNodeID'] = this.nodeID;
        updates[`nodes/${this.nodeID}`] = node;
        // add as parent of (pre-existing) children
        for (const childID of CE(node.children || {}).VKeys()) {
            updates[`nodes/${childID}/.parents/.${this.nodeID}`] = { _: true };
        }
        updates = MergeDBUpdates(updates, this.sub_addRevision.GetDBUpdates());
        return updates;
    }
}

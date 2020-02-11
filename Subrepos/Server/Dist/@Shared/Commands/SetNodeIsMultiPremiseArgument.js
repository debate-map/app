var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MapEdit, UserEdit } from "../CommandMacros";
import { AssertValidate } from "mobx-firelink";
import { Command, AssertV, MergeDBUpdates } from "mobx-firelink";
import { Clone, CE } from "js-vextensions";
import { AddNodeRevision } from "./AddNodeRevision";
import { GetNodeL2, AsNodeL1, GetNodeL3, GetNodeDisplayText, GetNodeForm } from "../Store/firebase/nodes/$node";
let SetNodeIsMultiPremiseArgument = class SetNodeIsMultiPremiseArgument extends Command {
    Validate() {
        AssertValidate({
            properties: {
                mapID: { type: "string" },
                nodeID: { type: "string" },
                multiPremiseArgument: { type: "boolean" },
            },
            required: ["nodeID", "multiPremiseArgument"],
        }, this.payload, "Payload invalid");
        const { mapID, nodeID, multiPremiseArgument } = this.payload;
        this.oldNodeData = GetNodeL2(nodeID);
        AssertV(this.oldNodeData, "oldNodeData is null.");
        this.newNodeData = Object.assign(Object.assign({}, AsNodeL1(this.oldNodeData)), { multiPremiseArgument });
        if (multiPremiseArgument) {
            this.newNodeData.childrenOrder = CE(this.oldNodeData.children).VKeys();
            if (this.oldNodeData.current.titles.base.length == 0) {
                const newRevision = Clone(this.oldNodeData.current);
                const oldChildNode_partialPath = `${nodeID}/${CE(this.oldNodeData.children).VKeys()[0]}`;
                const oldChildNode = GetNodeL3(oldChildNode_partialPath);
                AssertV(oldChildNode, "oldChildNode is null.");
                newRevision.titles.base = GetNodeDisplayText(oldChildNode, oldChildNode_partialPath, GetNodeForm(oldChildNode));
                this.sub_addRevision = new AddNodeRevision({ mapID, revision: newRevision });
                this.sub_addRevision.Validate();
            }
        }
        else {
            this.newNodeData.childrenOrder = null;
        }
        AssertValidate("MapNode", this.newNodeData, "New node-data invalid");
    }
    GetDBUpdates() {
        const { nodeID } = this.payload;
        let updates = {};
        updates[`nodes/${nodeID}`] = this.newNodeData;
        if (this.sub_addRevision) {
            updates = MergeDBUpdates(updates, this.sub_addRevision.GetDBUpdates());
        }
        return updates;
    }
};
SetNodeIsMultiPremiseArgument = __decorate([
    MapEdit,
    UserEdit
], SetNodeIsMultiPremiseArgument);
export { SetNodeIsMultiPremiseArgument };

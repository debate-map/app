var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MapEdit } from "../CommandMacros";
import { AddSchema, AssertValidate } from "mobx-firelink";
import { Command, AssertV } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { GetNodeL3, ReversePolarity } from "../Store/firebase/nodes/$node";
import { GetParentNodeID } from "../Store/firebase/nodes";
import { MapNodeType } from "../Store/firebase/nodes/@MapNodeType";
AddSchema("ReverseArgumentPolarity_payload", {
    properties: {
        mapID: { type: "string" },
        nodeID: { type: "string" },
        path: { type: "string" },
    },
    required: ["nodeID"],
});
let ReverseArgumentPolarity = class ReverseArgumentPolarity extends Command {
    Validate() {
        AssertValidate("ReverseArgumentPolarity_payload", this.payload, "Payload invalid");
        const { nodeID, path } = this.payload;
        this.oldNodeData = GetNodeL3(path);
        // AssertV(this.oldNodeData, "oldNodeData is null"); // realized I don't need to add these; the null-ref exceptions are sufficient
        this.parentID = GetParentNodeID(path);
        this.newLinkData = Object.assign({}, this.oldNodeData.link);
        this.newLinkData.polarity = ReversePolarity(this.newLinkData.polarity);
        AssertV(this.oldNodeData.type == MapNodeType.Argument, "Can only reverse polarity of an argument node.");
        AssertValidate("ChildEntry", this.newLinkData, "New link-data invalid");
    }
    GetDBUpdates() {
        const { nodeID } = this.payload;
        const updates = {};
        updates[`nodes/${this.parentID}/.children/.${nodeID}`] = this.newLinkData;
        return updates;
    }
};
ReverseArgumentPolarity = __decorate([
    MapEdit,
    UserEdit
], ReverseArgumentPolarity);
export { ReverseArgumentPolarity };

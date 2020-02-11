var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Command, AssertV } from "mobx-firelink";
import { AddSchema, AssertValidate, GetSchemaJSON } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { GetNode } from "../Store/firebase/nodes";
import { GetLinkUnderParent } from "../Store/firebase/nodes/$node";
AddSchema("UpdateLink_payload", ["ChildEntry"], () => ({
    properties: {
        linkParentID: { type: "string" },
        linkChildID: { type: "string" },
        linkUpdates: GetSchemaJSON("ChildEntry").Including("form", "polarity"),
    },
    required: ["linkParentID", "linkChildID", "linkUpdates"],
}));
let UpdateLink = class UpdateLink extends Command {
    Validate() {
        AssertValidate("UpdateLink_payload", this.payload, "Payload invalid");
        const { linkParentID, linkChildID, linkUpdates } = this.payload;
        const parent = GetNode(linkParentID);
        AssertV(parent, "parent is null.");
        const oldData = GetLinkUnderParent(linkChildID, parent);
        this.newData = Object.assign(Object.assign({}, oldData), linkUpdates);
        AssertValidate("ChildEntry", this.newData, "New link-data invalid");
    }
    GetDBUpdates() {
        const { linkParentID, linkChildID } = this.payload;
        const updates = {};
        updates[`nodes/${linkParentID}/.children/.${linkChildID}`] = this.newData;
        return updates;
    }
};
UpdateLink = __decorate([
    UserEdit
], UpdateLink);
export { UpdateLink };

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AddSchema, GetSchemaJSON, Schema, AssertValidate } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { Command, AssertV } from "mobx-firelink";
import { GetNodePhrasing } from "../Store/firebase/nodePhrasings";
const MTName = "MapNodePhrasing";
AddSchema(`Update${MTName}_payload`, [MTName], () => ({
    properties: {
        id: { type: "string" },
        updates: Schema({
            properties: GetSchemaJSON(MTName).properties.Including("type", "text", "description"),
        }),
    },
    required: ["id", "updates"],
}));
let UpdatePhrasing = class UpdatePhrasing extends Command {
    Validate() {
        AssertValidate(`Update${MTName}_payload`, this.payload, "Payload invalid");
        const { id, updates } = this.payload;
        this.oldData = GetNodePhrasing(id);
        AssertV(this.oldData, "oldData is null.");
        this.newData = Object.assign(Object.assign({}, this.oldData), updates);
        AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
    }
    GetDBUpdates() {
        const { id } = this.payload;
        const updates = {};
        updates[`nodePhrasings/${id}`] = this.newData;
        return updates;
    }
};
UpdatePhrasing = __decorate([
    UserEdit
], UpdatePhrasing);
export { UpdatePhrasing };

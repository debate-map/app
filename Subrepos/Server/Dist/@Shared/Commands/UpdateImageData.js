var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AssertV, Command } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { AssertValidate, AddSchema, Schema, GetSchemaJSON } from "mobx-firelink";
import { GetImage } from "../Store/firebase/images";
const MTName = "Image";
AddSchema(`Update${MTName}Details_payload`, [MTName], () => ({
    properties: {
        id: { type: "string" },
        updates: Schema({
            properties: GetSchemaJSON(MTName).properties.Including("name", "type", "url", "description", "previewWidth", "sourceChains"),
        }),
    },
    required: ["id", "updates"],
}));
let UpdateImageData = class UpdateImageData extends Command {
    Validate() {
        AssertValidate(`Update${MTName}Details_payload`, this.payload, "Payload invalid");
        const { id, updates } = this.payload;
        this.oldData = GetImage(id);
        AssertV(this.oldData, "oldData is null.");
        this.newData = Object.assign(Object.assign({}, this.oldData), updates);
        AssertValidate("Image", this.newData, "New-data invalid");
    }
    GetDBUpdates() {
        const { id } = this.payload;
        const updates = {
            [`images/${id}`]: this.newData,
        };
        return updates;
    }
};
UpdateImageData = __decorate([
    UserEdit
], UpdateImageData);
export { UpdateImageData };

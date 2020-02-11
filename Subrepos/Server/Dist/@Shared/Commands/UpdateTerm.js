var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { AssertValidate, AddSchema, GetSchemaJSON, Schema } from "mobx-firelink";
import { Command, AssertV } from "mobx-firelink";
import { GetTerm } from "../Store/firebase/terms";
const MTName = "Term";
AddSchema(`Update${MTName}_payload`, [MTName], () => ({
    properties: {
        id: { type: "string" },
        updates: Schema({
            properties: GetSchemaJSON(MTName)["properties"].Including("name", "forms", "disambiguation", "type", "definition", "note"),
        }),
    },
    required: ["id", "updates"],
}));
let UpdateTerm = class UpdateTerm extends Command {
    Validate() {
        const { termID, updates } = this.payload;
        this.oldData = GetTerm(termID);
        AssertV(this.oldData, "oldData is null.");
        this.newData = Object.assign(Object.assign({}, this.oldData), updates);
        AssertValidate("Term", this.newData, "New-data invalid");
    }
    GetDBUpdates() {
        const { termID } = this.payload;
        const updates = {
            [`terms/${termID}`]: this.newData,
        };
        if (this.newData.name != this.oldData.name) {
            updates[`termNames/${this.oldData.name.toLowerCase()}/.${termID}`] = null;
            updates[`termNames/${this.newData.name.toLowerCase()}/.${termID}`] = true;
        }
        return updates;
    }
};
UpdateTerm = __decorate([
    UserEdit
], UpdateTerm);
export { UpdateTerm };

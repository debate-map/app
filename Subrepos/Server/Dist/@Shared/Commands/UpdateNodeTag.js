var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AssertV, Command, AV } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { AddSchema, AssertValidate, GetSchemaJSON, Schema } from "mobx-firelink";
import { TagComp_keys } from "../Store/firebase/nodeTags/@MapNodeTag";
import { GetNodeTag } from "../Store/firebase/nodeTags";
import { IsUserCreatorOrMod } from "../Store/firebase/users/$user";
const MTName = "MapNodeTag";
AddSchema(`Update${MTName}_payload`, [MTName], () => ({
    properties: {
        id: { type: "string" },
        updates: Schema({
            properties: GetSchemaJSON(MTName).properties.Including("nodes", ...TagComp_keys),
            minProperties: 1,
        }),
    },
    required: ["id", "updates"],
}));
let UpdateNodeTag = class UpdateNodeTag extends Command {
    Validate() {
        AssertValidate(`Update${MTName}_payload`, this.payload, "Payload invalid");
        const { id, updates } = this.payload;
        this.oldData = AV.NonNull = GetNodeTag(id);
        AssertV(IsUserCreatorOrMod(this.userInfo.id, this.oldData), "User is not the tag's creator, or a moderator.");
        this.newData = Object.assign(Object.assign({}, this.oldData), updates);
        AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
    }
    GetDBUpdates() {
        const { id } = this.payload;
        const updates = {};
        updates[`nodeTags/${id}`] = this.newData;
        return updates;
    }
};
UpdateNodeTag = __decorate([
    UserEdit
], UpdateNodeTag);
export { UpdateNodeTag };

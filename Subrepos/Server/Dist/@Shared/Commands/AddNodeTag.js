var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Command, AssertV } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { AssertValidate, GenerateUUID } from "mobx-firelink";
import { HasModPermissions } from "../Store/firebase/users/$user";
import { GetNode } from "../Store/firebase/nodes";
let AddNodeTag = class AddNodeTag extends Command {
    Validate() {
        var _a;
        AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add tags currently.");
        const { tag } = this.payload;
        this.id = (_a = this.id, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        tag.creator = this.userInfo.id;
        tag.createdAt = Date.now();
        AssertValidate("MapNodeTag", tag, "MapNodeTag invalid");
        for (let nodeID of tag.nodes) {
            const node = GetNode(nodeID);
            AssertV(node, `Node with id ${nodeID} does not exist.`);
        }
        this.returnData = this.id;
    }
    GetDBUpdates() {
        const { tag } = this.payload;
        const updates = {
            [`nodeTags/${this.id}`]: tag,
        };
        return updates;
    }
};
AddNodeTag = __decorate([
    UserEdit
], AddNodeTag);
export { AddNodeTag };

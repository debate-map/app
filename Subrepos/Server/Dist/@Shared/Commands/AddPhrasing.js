var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { AssertValidate, GenerateUUID } from "mobx-firelink";
import { Assert } from "js-vextensions";
import { Command } from "mobx-firelink";
import { GetNode } from "../Store/firebase/nodes";
let AddPhrasing = class AddPhrasing extends Command {
    Validate() {
        var _a;
        const { phrasing } = this.payload;
        this.id = (_a = this.id, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        phrasing.creator = this.userInfo.id;
        phrasing.createdAt = Date.now();
        AssertValidate("MapNodePhrasing", phrasing, "MapNodePhrasing invalid");
        const node = GetNode(phrasing.node);
        Assert(node, `Node with id ${phrasing.node} does not exist.`);
        this.returnData = this.id;
    }
    GetDBUpdates() {
        const { phrasing } = this.payload;
        const updates = {
            [`nodePhrasings/${this.id}`]: phrasing,
        };
        return updates;
    }
};
AddPhrasing = __decorate([
    UserEdit
], AddPhrasing);
export { AddPhrasing };

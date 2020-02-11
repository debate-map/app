var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AssertV, Command } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { GetNodePhrasing } from "../Store/firebase/nodePhrasings";
let DeletePhrasing = class DeletePhrasing extends Command {
    Validate() {
        const { id } = this.payload;
        this.oldData = GetNodePhrasing(id);
        AssertV(this.oldData, "oldData is null");
    }
    GetDBUpdates() {
        const { id } = this.payload;
        const updates = {
            [`nodePhrasings/${id}`]: null,
        };
        return updates;
    }
};
DeletePhrasing = __decorate([
    UserEdit
], DeletePhrasing);
export { DeletePhrasing };

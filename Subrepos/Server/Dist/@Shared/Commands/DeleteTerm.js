var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { Command, AssertV } from "mobx-firelink";
import { GetTerm } from "../Store/firebase/terms";
let DeleteTerm = class DeleteTerm extends Command {
    Validate() {
        const { termID } = this.payload;
        this.oldData = GetTerm(termID);
        AssertV(this.oldData, "oldData is null.");
    }
    GetDBUpdates() {
        const { termID } = this.payload;
        const updates = {
            [`terms/${termID}`]: null,
            [`termNames/${this.oldData.name.toLowerCase()}/.${termID}`]: null,
        };
        return updates;
    }
};
DeleteTerm = __decorate([
    UserEdit
], DeleteTerm);
export { DeleteTerm };

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { AssertValidate, GenerateUUID } from "mobx-firelink";
import { Command } from "mobx-firelink";
let AddTerm = class AddTerm extends Command {
    Validate() {
        var _a;
        const { term } = this.payload;
        this.termID = (_a = this.termID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        term.creator = this.userInfo.id;
        term.createdAt = Date.now();
        this.returnData = this.termID;
        AssertValidate("Term", term, "Term invalid");
    }
    GetDBUpdates() {
        const { term } = this.payload;
        const updates = {
            // 'general/data/.lastTermID': this.termID,
            [`terms/${this.termID}`]: term,
            [`termNames/${term.name.toLowerCase()}/.${this.termID}`]: true,
        };
        return updates;
    }
};
AddTerm = __decorate([
    UserEdit
], AddTerm);
export { AddTerm };

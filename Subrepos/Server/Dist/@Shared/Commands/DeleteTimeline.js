var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { Command, AV } from "mobx-firelink";
import { GetTimeline } from "../Store/firebase/timelines";
let DeleteTimeline = class DeleteTimeline extends Command {
    Validate() {
        const { timelineID } = this.payload;
        this.oldData = AV.NonNull = GetTimeline(timelineID);
        if (this.oldData.steps) {
            throw new Error("Cannot delete a timeline until all its steps have been deleted.");
        }
    }
    GetDBUpdates() {
        const { timelineID } = this.payload;
        const updates = {};
        updates[`timelines/${timelineID}`] = null;
        updates[`maps/${this.oldData.mapID}/.timelines/.${timelineID}`] = null;
        return updates;
    }
};
DeleteTimeline = __decorate([
    UserEdit
], DeleteTimeline);
export { DeleteTimeline };

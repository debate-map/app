var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { Command } from "mobx-firelink";
import { AssertValidate, GenerateUUID } from "mobx-firelink";
let AddTimeline = class AddTimeline extends Command {
    Validate() {
        var _a;
        const { mapID, timeline } = this.payload;
        this.timelineID = (_a = this.timelineID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        timeline.mapID = mapID;
        timeline.createdAt = Date.now();
        this.returnData = this.timelineID;
        AssertValidate("Timeline", timeline, "Timeline invalid");
    }
    GetDBUpdates() {
        const { mapID, timeline } = this.payload;
        const updates = {
            // 'general/data/.lastTimelineID': this.timelineID,
            [`timelines/${this.timelineID}`]: timeline,
            [`maps/${mapID}/.timelines/.${this.timelineID}`]: true,
        };
        return updates;
    }
};
AddTimeline = __decorate([
    UserEdit
], AddTimeline);
export { AddTimeline };

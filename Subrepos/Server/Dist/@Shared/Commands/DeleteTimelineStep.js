var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { Command, AV } from "mobx-firelink";
import { GetTimelineStep } from "../Store/firebase/timelineSteps";
import { GetTimeline } from "../Store/firebase/timelines";
import { CE } from "js-vextensions";
let DeleteTimelineStep = class DeleteTimelineStep extends Command {
    Validate() {
        const { stepID } = this.payload;
        this.oldData = AV.NonNull = GetTimelineStep(stepID);
        const timeline = AV.NonNull = GetTimeline(this.oldData.timelineID);
        this.timeline_oldSteps = timeline.steps;
    }
    GetDBUpdates() {
        const { stepID } = this.payload;
        const updates = {};
        updates[`timelines/${this.oldData.timelineID}/.steps`] = CE(this.timeline_oldSteps).Except(stepID);
        updates[`timelineSteps/${stepID}`] = null;
        return updates;
    }
};
DeleteTimelineStep = __decorate([
    UserEdit
], DeleteTimelineStep);
export { DeleteTimelineStep };

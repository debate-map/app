var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { AssertValidate, GenerateUUID } from "mobx-firelink";
import { Command, AssertV } from "mobx-firelink";
import { GetTimeline } from "../Store/firebase/timelines";
import { CE } from "js-vextensions";
let AddTimelineStep = class AddTimelineStep extends Command {
    Validate() {
        var _a, _b;
        const { timelineID, step, stepIndex } = this.payload;
        // const lastStepID = await GetDataAsync('general', 'data', '.lastTimelineStepID') as number;
        this.stepID = (_a = this.stepID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        step.timelineID = timelineID;
        // this.timeline_oldSteps = await GetDocField_Async(a=>a.timelines.get(timelineID), a=>a.steps) || [];
        const timeline = GetTimeline(timelineID);
        AssertV(timeline, "timeline not yet loaded.");
        this.timeline_oldSteps = ((_b = timeline) === null || _b === void 0 ? void 0 : _b.steps) || [];
        this.timeline_newSteps = this.timeline_oldSteps.slice();
        if (stepIndex) {
            CE(this.timeline_newSteps).Insert(stepIndex, this.stepID);
        }
        else {
            this.timeline_newSteps.push(this.stepID);
        }
        AssertValidate("TimelineStep", step, "TimelineStep invalid");
    }
    GetDBUpdates() {
        const { timelineID, step } = this.payload;
        const updates = {
            // add step
            // 'general/data/.lastTimelineStepID': this.stepID,
            [`timelineSteps/${this.stepID}`]: step,
            // add to timeline
            [`timelines/${timelineID}/.steps`]: this.timeline_newSteps,
        };
        return updates;
    }
};
AddTimelineStep = __decorate([
    UserEdit
], AddTimelineStep);
export { AddTimelineStep };

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { Command, AssertV } from "mobx-firelink";
import { CE } from "js-vextensions";
import { GetTimeline } from "../Store/firebase/timelines";
let UpdateTimelineStepOrder = class UpdateTimelineStepOrder extends Command {
    Validate() {
        var _a;
        const { timelineID, stepID, newIndex } = this.payload;
        const timeline = GetTimeline(timelineID);
        AssertV(timeline, "timeline is null.");
        this.timeline_oldSteps = (_a = timeline.steps, (_a !== null && _a !== void 0 ? _a : []));
        this.timeline_newSteps = this.timeline_oldSteps.slice();
        CE(this.timeline_newSteps).Move(stepID, newIndex, false); // dnd system applies index-fixing itself, so don't apply here
    }
    GetDBUpdates() {
        const { timelineID } = this.payload;
        const updates = {
            [`timelines/${timelineID}/.steps`]: this.timeline_newSteps,
        };
        return updates;
    }
};
UpdateTimelineStepOrder = __decorate([
    UserEdit
], UpdateTimelineStepOrder);
export { UpdateTimelineStepOrder };

import {GetTimelineStep, NodeEffect, TimelineStepEffect} from "dm_common";
import {CreateAccessor} from "mobx-graphlink";
import {O} from "web-vcore";
import {DeepEquals} from "web-vcore/.yalc/js-vextensions";
import {makeObservable} from "web-vcore/nm/mobx";
import {ignore} from "web-vcore/nm/mobx-sync.js";

export class TimelinesState {
	constructor() { makeObservable(this); }

	// editor
	@O audioMode = true;
	@O audioPanel = new AudioPanelState();
	@O @ignore copiedNodeEffectInfo: {stepID: string, effectIndex: number, effectData: TimelineStepEffect, asCut: boolean}|n;

	// playing
	@O recordPanel = new RecordPanelState();
	@O nodeRevealHighlightTime = 20;
	@O hideEditingControls = false;
	@O showFocusNodes = false;
	@O layoutHelperMap_load = false;
	@O layoutHelperMap_show = false;
	@O @ignore autoScroll = true;
}

class AudioPanelState {
	constructor() { makeObservable(this); }
	@O selectedFile: string|n;

	@O waveformRows = 0;
	@O @ignore selection_start = 0;
	//@O @ignore selection_end = 0;
	@O playOnClick = true;

	@O @ignore wavesurferStateChangedAt = 0;
	@O @ignore act_startPlayAtTimeX = -1;
}

class RecordPanelState {
	constructor() { makeObservable(this); }
	@O @ignore recording = false;
}

export const GetCopiedNodeEffectInfo_IfValid = CreateAccessor({ctx: 1}, function() {
	const info = this.store.main.timelines.copiedNodeEffectInfo;
	if (info == null) return null;
	const step = GetTimelineStep(info.stepID);
	if (step == null) return null;
	const effectData_current = step.extras.effects?.[info.effectIndex];
	// if the data of the node-effect at the copied "slot" changed since copy time, invalidate the copy (to avoid copy-pasting of the wrong entry, eg. if deleted an earlier effect in array)
	if (!DeepEquals(effectData_current, info.effectData)) return null;

	return info;
});
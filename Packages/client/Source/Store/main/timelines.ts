import {GetTimelineStep, NodeEffect, TimelineStepEffect} from "dm_common";
import {CreateAccessor} from "mobx-graphlink";
import {Ignore, O} from "web-vcore";
import {DeepEquals} from "js-vextensions";
import {StepTab} from "./maps/mapStates/@MapState";

export class TimelinesState {
	// editor
	@O accessor audioMode = false;
	@O accessor audioPanel = new AudioPanelState();
	@O  @Ignore accessor copiedNodeEffectInfo: {stepID: string, effectIndex: number, effectData: TimelineStepEffect, asCut: boolean}|n;
	@O accessor selectedAudioInputDeviceID: string|n;

	// playing
	@O accessor recordPanel = new RecordPanelState();
	@O accessor nodeRevealHighlightTime = 20;
	@O accessor hideEditingControls = false;
	@O accessor showFocusNodes = false;
	@O accessor layoutHelperMap_load = false;
	@O accessor layoutHelperMap_show = false;
	@O  @Ignore accessor autoScroll = true;
	@O accessor stepTabDefault = StepTab.none;
}

class AudioPanelState {
	@O accessor selectedFile: string|n;

	@O accessor waveformRows = 0;
	@O  @Ignore accessor selection_start = 0;
	//@O  @Ignore accessor selection_end = 0;
	@O accessor playOnClick = true;

	@O  @Ignore accessor wavesurferStateChangedAt = 0;
	@O  @Ignore accessor act_startPlayAtTimeX = -1;
}

class RecordPanelState {
	@O accessor lockedMapSize = false;
	@O accessor lockedMapSize_x = 1920;
	@O accessor lockedMapSize_y = 1080;
	@O accessor renderFolderName = "RenderTest";
	@O accessor frameRender_minWait = 100;
	@O accessor frameRender_stabilityWait = 300;
	@O  @Ignore accessor recording = false;
	@O  @Ignore accessor recording_endFrame = -1;
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
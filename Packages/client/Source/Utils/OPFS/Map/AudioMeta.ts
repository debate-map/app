import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {Pair, emptyArray} from "web-vcore/nm/js-vextensions";
import {GetTimelineSteps, TimelineStep} from "dm_common";
import {OPFS_Map} from "../OPFS_Map";

export class AudioMeta {
	static GetOrCreateFileMeta(audioMeta: AudioMeta, fileName: string) {
		if (audioMeta.fileMetas[fileName] == null) {
			audioMeta.fileMetas[fileName] = new AudioFileMeta();
		}
		return audioMeta.fileMetas[fileName];
	}

	fileMetas = {} as {[key: string]: AudioFileMeta};
}
export class AudioFileMeta {
	duration?: number = 0;
	stepClips = {} as {[key: string]: StepAudioClip}
}

export class StepAudioClip {
	constructor(data?: Partial<StepAudioClip>) { Object.assign(this, data); }
	timeInAudio = 0;
	volume = 1;
}
export type AudioFileWithMeta = {file: File|undefined, meta: Pair<string, AudioFileMeta>|undefined};
export class StepAudioClipEnhanced {
	audio: AudioFileWithMeta;
	startTime: number;
	endTime: number|null;
	duration: number|null;
	volume: number;
}

export const GetAudioFileMetasForMap = CreateAccessor((mapID: string): Pair<string, AudioFileMeta>[]=>{
	const opfsForMap = OPFS_Map.GetEntry(mapID);
	const audioMeta = opfsForMap.AudioMeta;
	const audioFileMetas = audioMeta?.fileMetas.Pairs() ?? emptyArray;
	return audioFileMetas;
});
export const GetTopAudioForStep = CreateAccessor((step: TimelineStep, mapID: string)=>{
	const audioFileMetas = GetAudioFileMetasForMap(mapID);
	// todo: once custom ordering is implementing, use that for audio-file selection here
	const topAudioFileMetaForStep = audioFileMetas.find(a=>a.value.stepClips[step.id] != null);

	const opfsForMap = OPFS_Map.GetEntry(mapID);
	const topAudioFile = opfsForMap.Files.find(a=>a.name == topAudioFileMetaForStep?.key);
	return {file: topAudioFile, meta: topAudioFileMetaForStep};
});
export const GetStepAudioClipEnhanced = CreateAccessor((step: TimelineStep, nextStep: TimelineStep|n, mapID: string): StepAudioClipEnhanced|null=>{
	if (nextStep == null) return null;
	const topAudioForStep = GetTopAudioForStep(step, mapID);
	const stepClipInTopAudioFile = topAudioForStep?.meta?.value.stepClips[step.id];
	if (stepClipInTopAudioFile == null) return null;
	const startTime = stepClipInTopAudioFile.timeInAudio;

	const nextStepStartTimeInTopAudioFile = topAudioForStep?.meta?.value.stepClips[nextStep.id]?.timeInAudio;
	const endTime =
		// if the next-step uses this audio-file, our play segment (for this audio-file) ends at that next-step's start-time in the audio
		nextStepStartTimeInTopAudioFile ? nextStepStartTimeInTopAudioFile : // eslint-disable-line
		// else (if there is no next-step that uses this audio-file), our play segment ends at the end of the audio file
		topAudioForStep.meta?.value.duration ? topAudioForStep.meta.value.duration :
		// else (if audio-file's duration metadata hasn't been stored yet), record a null end-time (since duration is unknown/undefined)
		null;
	const duration = endTime != null ? endTime - startTime : null;

	return {audio: topAudioForStep, startTime, endTime, duration, volume: stepClipInTopAudioFile.volume};
});

export const GetAudioFilesActiveForTimeline = CreateAccessor((mapID: string, timelineID: string)=>{
	//const audioFileMetas = GetAudioFileMetasForMap(mapID);
	const steps = GetTimelineSteps(timelineID);
	const stepTopAudios = steps.map(step=>GetTopAudioForStep(step, mapID));
	return stepTopAudios.map(a=>a.file).filter(a=>a != null).Distinct() as File[];
});
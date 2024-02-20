import {GetTimelineSteps} from "dm_common";
import {Clone} from "js-vextensions";
import {CreateAccessor} from "mobx-graphlink";
import {computed, makeObservable} from "web-vcore/nm/mobx";
import {OPFSFolder} from "../OPFSFolder.js";
import {OPFS_Map} from "../OPFS_Map.js";
import {ReadFileText_AsJSON} from "../AccessorsForFiles.js";

export class OPFS_Step extends OPFSFolder {
	constructor(mapID: string, stepID: string) {
		super(["Maps", mapID, `Step_${stepID}`]);
		makeObservable(this);
		this.mapID = mapID;
		this.stepID = stepID;
	}
	mapID: string;
	stepID: string;

	@computed get StepMeta() {
		const file = this.Files.find(a=>a.name == "StepMeta.json");
		if (file == null) return null;
		return ReadFileText_AsJSON(file) as StepMeta;
	}
}

export async function ModifyStepMeta(opfsForStep: OPFS_Step, stepMeta: StepMeta|n, modifierFunc: (newMeta: StepMeta)=>any, saveNewStepMeta = true) {
	const newMeta = stepMeta ? Clone(stepMeta) as StepMeta : new StepMeta();
	modifierFunc(newMeta);
	if (saveNewStepMeta) {
		const json = JSON.stringify(newMeta, null, "\t"); // pretty-print the json; contents are small, so readability is more important than size
		await opfsForStep.SaveFile_Text(json, "StepMeta.json");
	}
	return newMeta; // return this, so if multiple modifications are made, they can build on top of each others' changes rather than overwriting them 
}
export async function ModifyTakeMeta(opfsForStep: OPFS_Step, stepMeta: StepMeta|n, takeNumber: number, modifierFunc: (newTakeMeta: TakeMeta)=>any, saveNewStepMeta = true) {
	const newStepMeta_final = await ModifyStepMeta(opfsForStep, stepMeta, newStepMeta=>{
		const newTakeMeta = newStepMeta.takeMetas[takeNumber] ?? new TakeMeta();
		modifierFunc(newTakeMeta);
		newStepMeta.takeMetas[takeNumber] = newTakeMeta;
	}, false);
	if (saveNewStepMeta) {
		const json = JSON.stringify(newStepMeta_final, null, "\t"); // pretty-print the json; contents are small, so readability is more important than size
		await opfsForStep.SaveFile_Text(json, "StepMeta.json");
	}
	return newStepMeta_final;
}

export class StepMeta {
	takeMetas: {[key: number]: TakeMeta} = {};
}
export class TakeMeta {
	rating = 0;
	volume = 1;

	// cached info about actual audio file
	c_duration: number|n;
}

export const GetTopAudioForStep = CreateAccessor((stepID: string, mapID: string)=>{
	const opfsForStep = OPFS_Map.GetEntry(mapID).GetStepFolder(stepID);
	const stepMeta = opfsForStep.StepMeta;
	const takeMetas = stepMeta?.takeMetas.Pairs() ?? [];
	if (takeMetas.length == 0) return {takeNumber: undefined, file: undefined, meta: undefined};

	const topTakeMeta = takeMetas
		.Reversed() // first reverse, so we prefer later takes (ie. for if ratings are equal)
		.OrderByDescending(a=>a.value.rating).FirstOrX(); // then sort by rating
	const topTakeNumber = topTakeMeta?.keyNum;

	const topAudioFile = opfsForStep.Files.find(a=>a.name == `Take${topTakeNumber}_Converted.wav`);
	if (topAudioFile == null) console.warn(`Could not find audio-file for take. @step(${stepID}) @takeNumber(${topTakeNumber})`);
	return {takeNumber: topTakeNumber, file: topAudioFile, meta: topTakeMeta?.value};
});
export const GetAudioFilesActiveForTimeline = CreateAccessor((mapID: string, timelineID: string)=>{
	const steps = GetTimelineSteps(timelineID);
	const stepTopAudios = steps.map(step=>GetTopAudioForStep(step.id, mapID));
	return stepTopAudios.map(a=>a.file).filter(a=>a != null).Distinct() as File[];
});
import {computed, makeObservable} from "web-vcore/nm/mobx";
import {O, RunInAction} from "web-vcore";
import {Clone} from "js-vextensions";
import {OPFSFolder} from "../OPFSFolder.js";

export class OPFS_Step extends OPFSFolder {
	constructor(mapID: string, stepID: string) {
		super(["Maps", mapID, `Step_${stepID}`]);
		makeObservable(this);
		this.mapID = mapID;
		this.stepID = stepID;
	}
	mapID: string;
	stepID: string;

	@computed get File_StepMeta() {
		return this.Files.find(a=>a.name == "StepMeta.json");
	}
	@O stepMeta_cache_data: StepMeta|n;
	@O stepMeta_cache_lastFileWithLoadStarted: File|n;
	@computed get StepMeta() {
		const file = this.File_StepMeta;
		if (file == null) return null;

		// if this file instance hasn't had a load of its data started yet, start that now (once it's loaded, the getter will re-run)
		if (file != this.stepMeta_cache_lastFileWithLoadStarted) {
			RunInAction("StepMeta.fileLoadStarted", ()=>this.stepMeta_cache_lastFileWithLoadStarted = file);
			(async()=>{
				const json = await file.text();
				if (file != this.stepMeta_cache_lastFileWithLoadStarted) return; // if another file-instance has started loading, abort (since this file-instance's data is no longer needed)
				RunInAction("AudioMeta.fileLoadCompleted", ()=>this.stepMeta_cache_data = JSON.parse(json));
			})();
		}

		return this.stepMeta_cache_data;
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

export class StepMeta {
	takeRatings: {[key: string]: number} = {};
	takeVolumes: {[key: string]: number} = {};
}
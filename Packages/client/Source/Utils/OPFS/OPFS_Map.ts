import {O, RunInAction} from "web-vcore";
import {computed, makeObservable} from "web-vcore/nm/mobx";
import {AudioMeta} from "./Map/AudioMeta";
import {OPFSFolder} from "./OPFSFolder";
import {OPFS_Step} from "./Map/OPFS_Step";

export class OPFS_Map extends OPFSFolder {
	static entries = new Map<string, OPFS_Map>();
	static GetEntry(mapID: string) {
		if (!this.entries.has(mapID)) {
			this.entries.set(mapID, new OPFS_Map(mapID));
		}
		return this.entries.get(mapID)!;
	}
	constructor(mapID: string) {
		super(["Maps", mapID]);
		makeObservable(this);
		this.mapID = mapID;
	}
	mapID: string;

	stepFolders = new Map<string, OPFS_Step>();
	GetStepFolder(stepID: string) {
		if (!this.stepFolders.has(stepID)) {
			this.stepFolders.set(stepID, new OPFS_Step(this.mapID, stepID));
		}
		return this.stepFolders.get(stepID)!;
	}

	@computed get File_AudioMeta() {
		return this.files.find(a=>a.name == "AudioMeta.json");
	}
	@O audioMeta_cache_data: AudioMeta|n;
	@O audioMeta_cache_lastFileWithLoadStarted: File|n;
	@computed get AudioMeta() {
		const file = this.File_AudioMeta;
		if (file == null) return null;

		// if this file instance hasn't had a load of its data started yet, start that now (once it's loaded, the getter will re-run)
		if (file != this.audioMeta_cache_lastFileWithLoadStarted) {
			RunInAction("AudioMeta.fileLoadStarted", ()=>this.audioMeta_cache_lastFileWithLoadStarted = file);
			(async()=>{
				const json = await file.text();
				if (file != this.audioMeta_cache_lastFileWithLoadStarted) return; // if another file-instance has started loading, abort (since this file-instance's data is no longer needed)
				RunInAction("AudioMeta.fileLoadCompleted", ()=>this.audioMeta_cache_data = JSON.parse(json));
			})();
		}

		return this.audioMeta_cache_data;
	}
}
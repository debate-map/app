import {O, RunInAction} from "web-vcore";
import {computed, makeObservable} from "mobx";
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
}
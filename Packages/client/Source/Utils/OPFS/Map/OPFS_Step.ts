import {makeObservable} from "web-vcore/nm/mobx";
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
}
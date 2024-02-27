import {DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink";

@MGLClass({table: "globalData"})
export class GlobalData {
	/*lastImageID: number;
	lastLayerID: number;
	lastMapID: number;
	lastNodeID: string;
	lastNodeRevisionID: number;
	lastTermID: number;
	lastTermComponentID: number;
	lastTimelineID: number;
	lastTimelineStepID: number;*/

	// this "id" field is just needed to be more consistent with the other tables (so mobx-graphlink doesn't need special handling for these singleton-type classes)
	@DB((t, n)=>t.text(n).primary())
	//@Field({$ref: "UUID"}, {opt: true})
	@Field({type: "string"})
	id: string; // can be whatever (I use "main")

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: "GlobalData_Extras"})
	extras = new GlobalData_Extras();
}

@MGLClass({}, {additionalProperties: true})
export class GlobalData_Extras {
	constructor(data?: Partial<GlobalData_Extras>) {
		Object.assign(this, data);
	}

	@Field({type: "boolean"}, {opt: true})
	dbReadOnly?: boolean;

	@Field({type: "string"}, {opt: true})
	dbReadOnly_message?: string;
}
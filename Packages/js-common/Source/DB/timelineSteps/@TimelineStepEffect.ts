import {NodeReveal} from "./@TimelineStep";

export class TimelineStepEffect {
	constructor(data?: Partial<TimelineStepEffect>) { Object.assign(this, data); }
	time_relative: number;

	//nodeReveal?: NodeReveal;
	setTimeTrackerState?: boolean;
}

// after accessor-based processing
export class TimelineStepEffect_Resolved extends TimelineStepEffect {
	time_absolute: number;
}
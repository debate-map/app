import {O} from "web-vcore";
import {makeObservable} from "mobx";

export class TestingState {
	constructor() { makeObservable(this); }

	@O.ref testSequences: TestSequence[] = [
		new TestSequence(),
	];
}

export class TestSequence {
	steps: TestStep[] = [];
}
export class TestStep {
	enabled?: boolean;
	preWait?: number;
	postWait?: number;
	waitTillComplete?: boolean;
	waitTillDurationX?: number;

	stepBatch?: TS_StepBatch;
	addNodeRevision?: TS_AddNodeRevision;
}
export class TS_StepBatch {
	steps: TestStep[] = [];
	repeatCount?: number;
}
export class TS_AddNodeRevision {
	nodeID: string;
}
import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";

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
	preWait?: number;
	postWait?: number;

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
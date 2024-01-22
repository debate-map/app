export class TimelineStepEffect {
	constructor(data?: Partial<TimelineStepEffect>) { Object.assign(this, data); }
	/** Time that effect takes place, as seconds since start of step. */
	time_relative = 0;

	nodeEffect?: NodeEffect;
	setTimeTrackerState?: boolean;
}

export function IsStepEffectEmpty(stepEffect: TimelineStepEffect) {
	return IsNodeEffectEmpty(stepEffect.nodeEffect) && stepEffect.setTimeTrackerState == null;
}

export class NodeEffect {
	constructor(data?: RequiredBy<Partial<NodeEffect>, "path">) {
		Object.assign(this, data);
	}

	path: string;

	show?: boolean|n;
	show_revealDepth?: number|n;
	changeFocusLevelTo?: number|n;
	setExpandedTo?: boolean|n;
	hide?: boolean|n;
	//hide_delay?: number|n;
}

export function IsNodeEffectEmpty(nodeEffect: NodeEffect|n) {
	if (nodeEffect == null) return true;
	return nodeEffect.show == null && nodeEffect.changeFocusLevelTo == null && nodeEffect.setExpandedTo == null && nodeEffect.hide == null;
}
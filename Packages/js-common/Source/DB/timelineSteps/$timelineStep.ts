import {emptyArray} from "web-vcore/nm/js-vextensions";
import {CreateAccessor} from "mobx-graphlink";
import {TimelineStep} from "./@TimelineStep";
import {NodeEffect, TimelineStepEffect} from "./@TimelineStepEffect";

export const GetStepEffects = CreateAccessor((step: TimelineStep): TimelineStepEffect[]=>{
	return step.extras?.effects ?? emptyArray;
});
export const GetNodeEffects = CreateAccessor((step: TimelineStep): NodeEffect[]=>{
	return step.extras?.effects?.filter(a=>a.nodeEffect).map(a=>a.nodeEffect) ?? emptyArray;
});
export const GetNodeEffectsInMultipleSteps = CreateAccessor((steps: TimelineStep[]): NodeEffect[]=>{
	return steps.SelectMany(a=>GetNodeEffects(a));
});
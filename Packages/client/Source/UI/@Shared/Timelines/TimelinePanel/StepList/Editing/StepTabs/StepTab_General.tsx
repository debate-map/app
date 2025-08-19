import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {Pre, Row, Select, Spinner, Text, TimeSpanInput} from "react-vcomponents";
import {GetEntries} from "js-vextensions";
import {StepEditorUI_SharedProps} from "../StepEditorUI.js";
import React from "react";

export enum PositionOptionsEnum {
	full = "full",
	left = "left",
	right = "right",
	center = "center",
}

export const positionOptions = GetEntries(PositionOptionsEnum);

export const StepTab_General = (props: StepEditorUI_SharedProps)=>{
	const {step, creatorOrMod} = props;

	const timeType =
		step?.timeFromStart != null ? "from start" :
		step?.timeFromLastStep != null ? "from last step" :
		"until next step";

	return (
		<Row center>
			<Text>Time </Text>
			<Select options={["from start", "from last step", "until next step"]} value={timeType} onChange={typeStr=>{
				const val = (step.timeFromStart ?? step.timeFromLastStep ?? step.timeUntilNextStep) ?? 0;
				if (typeStr == "from start") {
					RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: val, timeFromLastStep: null, timeUntilNextStep: null}});
				} else if (typeStr == "from last step") {
					RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: null, timeFromLastStep: val, timeUntilNextStep: null}});
				} else if (typeStr == "until next step") {
					RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: null, timeFromLastStep: null, timeUntilNextStep: val}});
				}
			}}/>
			<Text> : </Text>
			{timeType == "from start" &&
			<TimeSpanInput largeUnit="minute" smallUnit="second" style={{width: 60}} enabled={creatorOrMod} value={step.timeFromStart ?? 0} onChange={val=>{
				RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: val}});
			}}/>}
			{timeType == "from last step" &&
			<>
				<Spinner style={{width: 60}} enabled={creatorOrMod} step="any" value={step.timeFromLastStep ?? 0} onChange={val=>{
					RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromLastStep: val}});
				}}/>
				<Text title="seconds">s</Text>
			</>}
			{timeType == "until next step" &&
			<>
				<Spinner style={{width: 60}} enabled={creatorOrMod} step="any" value={step.timeUntilNextStep ?? 0} onChange={val=>{
					RunCommand_UpdateTimelineStep({id: step.id, updates: {timeUntilNextStep: val}});
				}}/>
				<Text title="seconds">s</Text>
			</>}
			<Pre ml={5}>Pos: </Pre>
			<Select options={positionOptions} value={step.groupID} enabled={creatorOrMod} onChange={val=>{
				RunCommand_UpdateTimelineStep({id: step.id, updates: {groupID: val}});
			}}/>
		</Row>
	);
};

import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {Button, Pre, Row, Select, Spinner, Text, TimeSpanInput} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {TimelineStep, DMap} from "dm_common";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {store} from "Store";
import {GetEntries} from "js-vextensions";
import {StepEditorUI_SharedProps} from "../StepEditorUI.js";

type SharedProps = {map: DMap, step: TimelineStep, nextStep: TimelineStep|n, creatorOrMod: boolean};

export enum PositionOptionsEnum {
	full = "full",
	left = "left",
	right = "right",
	center = "center",
}
export const positionOptions = GetEntries(PositionOptionsEnum);

export class StepTab_General extends BaseComponent<StepEditorUI_SharedProps, {}> {
	render() {
		const {map, step, nextStep, creatorOrMod} = this.props;
		const audioUIState = store.main.timelines.audioPanel;
		const timeType =
			step?.timeFromStart != null ? "from start" :
			step?.timeFromLastStep != null ? "from last step" :
			"until next step";

		const opfsForMap = OPFS_Map.GetEntry(map.id);

		/*const stepAudioSegment = GetStepAudioClipEnhanced(step, nextStep, map.id);
		let stepDurationDerivedFromAudio = stepAudioSegment?.duration;
		// if could not derive step-duration based on assumption of "step being one segment among many in audio file"...
		if (stepDurationDerivedFromAudio == null) {
			// ...then try to derive the step-duration from the audio-file's full-length (assuming this is the only step associated with that audio file)
			for (const {value: audioFileMeta} of audioFileMetas) {
				const stepClipPairs = audioFileMeta.stepClips.Pairs();
				if (stepClipPairs.length == 1 && stepClipPairs[0].key == step.id) {
					stepDurationDerivedFromAudio = audioFileMeta.duration;
					break;
				}
			}
		}*/

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
				{/*<Button mdIcon="creation" title={`Derive time from audio file(s) (${stepDurationDerivedFromAudio}s)`} ml={5}
					enabled={creatorOrMod && nextStep != null && stepDurationDerivedFromAudio != null && stepDurationDerivedFromAudio.toFixed(3) != step.timeUntilNextStep?.toFixed(3)} // number stored in db can differ slightly, so round to 1ms
					onClick={()=>{
						RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: null, timeFromLastStep: null, timeUntilNextStep: stepDurationDerivedFromAudio}});
					}}/>*/}
				{/* <Pre>Speaker: </Pre>
				<Select value={} onChange={val=> {}}/> */}
				<Pre ml={5}>Pos: </Pre>
				<Select options={positionOptions} value={step.groupID} enabled={creatorOrMod} onChange={val=>{
					RunCommand_UpdateTimelineStep({id: step.id, updates: {groupID: val}});
				}}/>
				{/*<Button ml={5} mdIcon="ray-start-arrow" enabled={creatorOrMod && store.main.timelines.audioPanel.selectedFile != null} onClick={()=>{
					SetStepClipTimeInAudio(opfsForMap, audioMeta, audioUIState.selectedFile!, step.id, store.main.timelines.audioPanel.selection_start);
				}}/>*/}
			</Row>
		);
	}
}
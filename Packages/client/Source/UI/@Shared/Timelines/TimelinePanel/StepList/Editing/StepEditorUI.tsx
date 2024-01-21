import {store} from "Store";
import {RunCommand_AddTimelineStep, RunCommand_DeleteTimelineStep, RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {AudioFileMeta, AudioMeta, GetStepAudioClipEnhanced, StepAudioClip} from "Utils/OPFS/Map/AudioMeta";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {liveSkin} from "Utils/Styles/SkinManager";
import {DraggableInfo, DroppableInfo} from "Utils/UI/DNDStructures.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {GetTimelineSteps, IsUserCreatorOrMod, Map, MeID, OrderKey, Timeline, TimelineStep, TimelineStepEffect} from "dm_common";
import {DragInfo, MakeDraggable, Observer} from "web-vcore";
import {Clone, E, GetEntries, ToJSON, VRect, Vector2, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {RunInAction} from "web-vcore/nm/mobx-graphlink.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd.js";
import {Button, Column, Pre, Row, Select, Spinner, Text, TextArea, TimeSpanInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {ShowVMenu, VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {NodeRevealUI} from "./NodeRevealUI.js";
import {StepEffectUI} from "./StepEffectUI.js";

export enum PositionOptionsEnum {
	full = "full",
	left = "left",
	right = "right",
	center = "center",
}
/*export const positionOptions = [
	{ name: 'Full', value: null },
	{ name: 'Left', value: 1 },
	{ name: 'Right', value: 2 },
	{ name: 'Center', value: 3 },
];*/
export const positionOptions = GetEntries(PositionOptionsEnum);

/* let portal: HTMLElement;
WaitXThenRun(0, () => {
	portal = document.createElement('div');
	document.body.appendChild(portal);
}); */

export async function ModifyAudioFileMeta(opfsForMap: OPFS_Map, audioMeta: AudioMeta|n, audioFileName: string, modifierFunc: (newAudioFileMeta: AudioFileMeta)=>any, saveNewAudioMeta = true) {
	const newAudioMeta = audioMeta ? Clone(audioMeta) as AudioMeta : new AudioMeta();
	const newAudioFileMeta = AudioMeta.GetOrCreateFileMeta(newAudioMeta, audioFileName);
	modifierFunc(newAudioFileMeta);
	if (saveNewAudioMeta) {
		const json = JSON.stringify(newAudioMeta, null, "\t"); // pretty-print the json; contents are small, so readability is more important than size
		await opfsForMap.SaveFile_Text(json, "AudioMeta.json");
	}
	return newAudioMeta; // return this, so if multiple modifications are made, they can build on top of each others' changes rather than overwriting them 
}
export async function DeleteStepClip(opfsForMap: OPFS_Map, audioMeta: AudioMeta|n, audioFileName: string, stepID: string) {
	return ModifyAudioFileMeta(opfsForMap, audioMeta, audioFileName, newAudioFileMeta=>{
		delete newAudioFileMeta[stepID];
	});
}
export async function SetStepClipTimeInAudio(opfsForMap: OPFS_Map, audioMeta: AudioMeta|n, audioFileName: string, stepID: string, startTime: number) {
	return ModifyAudioFileMeta(opfsForMap, audioMeta, audioFileName, newAudioFileMeta=>{
		newAudioFileMeta.stepClips[stepID] = new StepAudioClip({...newAudioFileMeta.stepClips[stepID], timeInAudio: startTime});
	});
}
export async function SetStepClipVolume(opfsForMap: OPFS_Map, audioMeta: AudioMeta|n, audioFileName: string, stepID: string, volume: number) {
	return ModifyAudioFileMeta(opfsForMap, audioMeta, audioFileName, newAudioFileMeta=>{
		newAudioFileMeta.stepClips[stepID] = new StepAudioClip({...newAudioFileMeta.stepClips[stepID], volume});
	});
}

export type StepEditorUIProps = {index: number, map: Map, timeline: Timeline, step: TimelineStep, nextStep: TimelineStep|n, draggable?: boolean} & {dragInfo?: DragInfo};

export async function AddTimelineStep_Simple(timelineID: string, steps: TimelineStep[], insertIndex: number) {
	if (MeID() == null) return ShowSignInPopup();
	if (steps == null) return; // steps must still be loading; just ignore the click

	// calculate the insert-index to be just after the middle entry of the visible-step-range
	/*const visibleStepRange = this.stepList?.getVisibleRange() ?? [steps.length - 1, steps.length - 1];
	const insertIndex = Math.floor(visibleStepRange.Average() + 1);*/

	const prevStepForInsert = steps[insertIndex - 1];
	const nextStepForInsert = steps[insertIndex];

	const newStep = new TimelineStep({
		timelineID,
		orderKey: OrderKey.between(prevStepForInsert?.orderKey, nextStepForInsert?.orderKey).toString(),
		groupID: "full",
		message: "",
		nodeReveals: [],
	});
	await RunCommand_AddTimelineStep(newStep);
}

@MakeDraggable(({index, step, draggable}: StepEditorUIProps)=>{
	if (draggable == false) return undefined as any; // completely disable draggable behavior (see web-vcore/.../DNDHelpers.tsx for more info)
	// upgrade note: make sure dnd isn't broken from having to comment the next line out
	// if (step == null) return null; // if step is not yet loaded, don't actually apply the draggable-wrapping
	return {
		type: "TimelineStep",
		draggableInfo: new DraggableInfo({stepID: step.id}),
		index,
		// enabled: step != null, // if step is not yet loaded, don't actually apply the draggable-wrapping
	};
})
@Observer
// @SimpleShouldUpdate({ propsToIgnore: ['dragInfo'] })
export class StepEditorUI extends BaseComponentPlus({} as StepEditorUIProps, {placeholderRect: null as VRect|n}) {
	/* static ValidateProps(props: StepUIProps) {
		Assert(props.step != null);
	} */

	/* shouldComponentUpdate(newProps, newState) {
		if (ShallowChanged(this.props.ExcludeKeys('dragInfo'), newProps.ExcludeKeys('dragInfo')) || ShallowChanged(this.state, newState)) return true;
		// for dragInfo, do a json-based comparison (I think this is fine?)
		if (ToJSON(this.props.dragInfo) != ToJSON(newProps.dragInfo)) return true;
		return false;
	} */

	render() {
		const {index, map, timeline, step, nextStep, dragInfo} = this.props;
		const {placeholderRect} = this.state;
		//const step = GetTimelineStep(stepID);
		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);
		const audioUIState = store.main.timelines.audioPanel;

		if (step == null) {
			return <div style={{height: 100}}><div {...(dragInfo && dragInfo.provided.draggableProps)} {...(dragInfo && dragInfo.provided.dragHandleProps)}/></div>;
		}
		const timeType =
			step?.timeFromStart != null ? "from start" :
			step?.timeFromLastStep != null ? "from last step" :
			"until next step";

		const opfsForMap = OPFS_Map.GetEntry(map.id);
		//const files = opfsForMap.Files;
		const audioMeta = opfsForMap.AudioMeta;
		const audioFileMetas = audioMeta?.fileMetas.Pairs() ?? [];
		const stepClipsInAudioFiles = audioFileMetas.ToMapObj(a=>a.key, a=>a.value.stepClips[step.id]).Pairs().filter(a=>a.value != null);

		const stepAudioSegment = GetStepAudioClipEnhanced(step, nextStep, map.id);
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
		}

		const steps = GetTimelineSteps(timeline.id);

		const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
		const result = (
			// wrapper needed to emulate margin-top (since react-list doesn't support margins)
			<div style={{paddingTop: index == 0 ? 0 : 7}}>
				<Column /* mt={index == 0 ? 0 : 7} */ {...(dragInfo && dragInfo.provided.draggableProps)}
					style={E(
						{
							background: liveSkin.BasePanelBackgroundColor().alpha(1).css(), borderRadius: 10,
							//border: "1px solid rgba(255,255,255,.15)"
						},
						dragInfo && dragInfo.provided.draggableProps.style,
						asDragPreview && {zIndex: zIndexes.draggable},
					)}>
					<Row center p="3px 7px" style={{
						borderRadius: "10px 10px 0 0",
						/*background: "rgba(0,0,0,.7)",
						color: "rgba(255,255,255,.7)",*/
					}}>
						<Pre sel>{step.id.slice(0, 3)}</Pre>
						<Pre> (#{index + 1})</Pre>
						{/* <Button ml={5} text="Edit" title="Edit this step" style={{ flexShrink: 0 }} onClick={() => {
							ShowEditTimelineStepDialog(MeID(), step);
						}}/> */}
						<div {...(dragInfo && dragInfo.provided.dragHandleProps)} style={E({flex: 1, alignSelf: "stretch", margin: "0 5px", borderRadius: 20, background: "rgba(0,0,0,.1)"})}/>
						<Row center ml="auto">
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
							<Button mdIcon="creation" title={`Derive time from audio file(s) (${stepDurationDerivedFromAudio}s)`} ml={5}
								enabled={creatorOrMod && nextStep != null && stepDurationDerivedFromAudio != null && stepDurationDerivedFromAudio.toFixed(3) != step.timeUntilNextStep?.toFixed(3)} // number stored in db can differ slightly, so round to 1ms
								onClick={()=>{
									RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: null, timeFromLastStep: null, timeUntilNextStep: stepDurationDerivedFromAudio}});
								}}/>
							{/* <Pre>Speaker: </Pre>
							<Select value={} onChange={val=> {}}/> */}
							<Pre ml={5}>Pos: </Pre>
							<Select options={positionOptions} value={step.groupID} enabled={creatorOrMod} onChange={val=>{
								RunCommand_UpdateTimelineStep({id: step.id, updates: {groupID: val}});
							}}/>
							<Button ml={5} mdIcon="ray-start-arrow" enabled={creatorOrMod && store.main.timelines.audioPanel.selectedFile != null} onClick={()=>{
								SetStepClipTimeInAudio(opfsForMap, audioMeta, audioUIState.selectedFile!, step.id, store.main.timelines.audioPanel.selection_start);
							}}/>
							<Button ml={5} mdIcon="dots-vertical" onClick={e=>{
								const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
								ShowVMenu(
									{pos: new Vector2(buttonRect.left, buttonRect.top + buttonRect.height)},
									<>
										<VMenuItem text="Add step (above)" enabled={creatorOrMod} style={liveSkin.Style_VMenuItem()} onClick={()=>{
											AddTimelineStep_Simple(timeline.id, steps, index);
										}}/>
										<VMenuItem text="Add step (below)" enabled={creatorOrMod} style={liveSkin.Style_VMenuItem()} onClick={()=>{
											AddTimelineStep_Simple(timeline.id, steps, index + 1);
										}}/>
										<VMenuItem text="Clone" enabled={creatorOrMod} style={liveSkin.Style_VMenuItem()}
											onClick={e=>{
												if (e.button != 0) return;
												const newTimelineStep = Clone(step);
												newTimelineStep.orderKey = new OrderKey(step.orderKey).next().toString();
												RunCommand_AddTimelineStep(newTimelineStep);
											}}/>
										<VMenuItem text="Delete" enabled={creatorOrMod} style={liveSkin.Style_VMenuItem()} onClick={()=>{
											ShowMessageBox({
												title: `Delete step ${index + 1}`, cancelButton: true,
												message: `
													Delete timeline step with text:
			
													${step.message}
												`.AsMultiline(0),
												onOK: ()=>{
													RunCommand_DeleteTimelineStep({id: step.id});
												},
											});
										}}/>
									</>,
								);
							}}/>
						</Row>
					</Row>
					{stepClipsInAudioFiles.map(stepClipPair=>{
						const audioFileMeta = audioFileMetas.find(a=>a.key == stepClipPair.key)!;
						return (
							<Row key={index} mt={5} p="1px 5px">
								<Text>{`In "${audioFileMeta.key}": Volume:`}</Text>
								<Spinner ml={5} style={{width: 50}} enabled={creatorOrMod} value={stepClipPair.value.volume} onChange={async val=>{
									SetStepClipVolume(opfsForMap, audioMeta, audioFileMeta.key, step.id, val);
								}}/>
								<Text ml={5}>{`Step start time:`}</Text>
								<TimeSpanInput ml={5} largeUnit="minute" smallUnit="second" style={{width: 80}} enabled={creatorOrMod} value={stepClipPair.value.timeInAudio} onChange={async val=>{
									SetStepClipTimeInAudio(opfsForMap, audioMeta, audioFileMeta.key, step.id, val);
								}}/>
								<Button ml={5} mdIcon="play" enabled={audioUIState.selectedFile == audioFileMeta.key} onClick={()=>{
									RunInAction("StepEditorUI.playAudio", ()=>{
										//audioUIState.selectedFile = audioFileMeta.key;
										//audioUIState.selection_start = startTime;
										//audioUIState.act_startPlayAtTimeX = Date.now(); // this triggers the wavesurfer to actually start playing
										audioUIState.act_startPlayAtTimeX = stepClipPair.value.timeInAudio;
									});
								}}/>
								<Button ml={5} mdIcon="delete" onClick={()=>{
									DeleteStepClip(opfsForMap, audioMeta, audioFileMeta.key, step.id);
								}}/>
							</Row>
						);
					})}
					{/* <Row ml={5} style={{ minHeight: 20 }}>{step.message}</Row> */}
					<TextArea /* {...{ useCacheForDOMMeasurements: true } as any} */ autoSize={true}
						style={{
							//background: "rgba(255,255,255,.2)",
							padding: 5, outline: "none",
							borderWidth: "1px 0 1px 0",
						}}
						value={step.message} enabled={creatorOrMod}
						onChange={val=>{
							RunCommand_UpdateTimelineStep({id: step.id, updates: {message: val}});
						}}/>
					<Droppable type="NodeL1" droppableId={ToJSON(new DroppableInfo({type: "TimelineStepNodeRevealList", timelineID: timeline.id, stepID: step.id}))} isDropDisabled={!creatorOrMod}>
						{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>{
							const dragIsOverDropArea = (provided.placeholder as any)?.props["on"] != null;
							if (dragIsOverDropArea) {
								WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder());
							}

							return (
								<Column ref={c=>{ this.nodeHolder = c; provided.innerRef(GetDOM(c) as any); }} {...provided.droppableProps}
									style={E(
										{
											position: "relative", padding: 7, background: "rgba(255,255,255,.3)", borderRadius: "0 0 10px 10px",
											//border: "solid rgba(0,0,0,.7)", borderWidth: "0 1px 1px 1px"
										},
										(step.nodeReveals == null || step.nodeReveals.length == 0) && {padding: "3px 5px"},
									)}>
									<Row>
										<Text>Effects:</Text>
										<Button ml={5} mdIcon="plus" onClick={e=>{
											const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
											ShowVMenu(
												{pos: new Vector2(buttonRect.left, buttonRect.top + buttonRect.height)},
												<>
													<VMenuItem text="Set time-tracker state: visible" style={liveSkin.Style_VMenuItem()} onClick={()=>{
														const newEffects = [
															...(step.extras?.effects ?? []),
															new TimelineStepEffect({setTimeTrackerState: true}),
														];
														RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
													}}/>
													<VMenuItem text="Set time-tracker state: hidden" style={liveSkin.Style_VMenuItem()} onClick={()=>{
														const newEffects = [
															...(step.extras?.effects ?? []),
															new TimelineStepEffect({setTimeTrackerState: false}),
														];
														RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
													}}/>
												</>,
											);
										}}/>
										{//(step.nodeReveals == null || step.nodeReveals.length == 0) && !dragIsOverDropArea &&
										<div style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, opacity: 0.7, textAlign: "center"}}>
											Drag nodes here to give them time-bound effects: display, expand, etc.
										</div>}
									</Row>
									{step.extras?.effects && step.extras.effects.map((effect, index)=>{
										return <StepEffectUI key={index} map={map} step={step} effect={effect} editing={true} index={index}/>;
									})}
									{step.nodeReveals && step.nodeReveals.map((nodeReveal, index)=>{
										return <NodeRevealUI key={index} map={map} step={step} nodeReveal={nodeReveal} editing={creatorOrMod} index={index}/>;
									})}
									{provided.placeholder}
									{dragIsOverDropArea && placeholderRect &&
										<div style={{
											// position: 'absolute', left: 0 /* placeholderRect.x */, top: placeholderRect.y, width: placeholderRect.width, height: placeholderRect.height,
											position: "absolute", left: 7 /* placeholderRect.x */, top: placeholderRect.y, right: 7, height: placeholderRect.height,
											border: "1px dashed rgba(255,255,255,1)", borderRadius: 5,
										}}/>}
								</Column>
							);
						}}
					</Droppable>
				</Column>
			</div>
		);

		// if drag preview, we have to put in portal, since otherwise the "filter" effect of ancestors causes the {position:fixed} style to not be relative-to-page
		/* if (asDragPreview) {
			return ReactDOM.createPortal(result, portal);
		} */
		return result;
	}
	nodeHolder: Row|n;

	StartGeneratingPositionedPlaceholder() {
		if (this.nodeHolder == null || !this.nodeHolder.mounted || this.nodeHolder.DOM == null) {
			// call again in a second, once node-holder is initialized
			WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder());
			return;
		}

		const nodeHolderRect = VRect.FromLTWH(this.nodeHolder.DOM.getBoundingClientRect());
		const dragBox = document.querySelector(".NodeBox.DragPreview");
		if (dragBox == null) return; // this can happen at end of drag
		const dragBoxRect = VRect.FromLTWH(dragBox.getBoundingClientRect());

		const siblingNodeUIs = (Array.from(this.nodeHolder.DOM.childNodes) as HTMLElement[]).filter(a=>a.classList.contains("NodeUI"));
		const siblingNodeUIInnerDOMs = siblingNodeUIs.map(nodeUI=>nodeUI.QuerySelector_BreadthFirst(".NodeBox")).filter(a=>a != null); // entry can be null if inner-ui still loading
		const firstOffsetInner = siblingNodeUIInnerDOMs.find(a=>a && a.style.transform && a.style.transform.includes("translate("));

		let placeholderRect: VRect;
		if (firstOffsetInner) {
			const firstOffsetInnerRect = VRect.FromLTWH(firstOffsetInner.getBoundingClientRect()).NewTop(top=>top - dragBoxRect.height);
			const firstOffsetInnerRect_relative = new VRect(firstOffsetInnerRect.Position.Minus(nodeHolderRect.Position), firstOffsetInnerRect.Size);

			placeholderRect = firstOffsetInnerRect_relative.NewWidth(dragBoxRect.width).NewHeight(dragBoxRect.height);
		} else {
			if (siblingNodeUIInnerDOMs.length && siblingNodeUIInnerDOMs.Last() != null) {
				const lastInner = siblingNodeUIInnerDOMs.Last()!;
				const lastInnerRect = VRect.FromLTWH(lastInner.getBoundingClientRect()).NewTop(top=>top - dragBoxRect.height);
				const lastInnerRect_relative = new VRect(lastInnerRect.Position.Minus(nodeHolderRect.Position), lastInnerRect.Size);

				placeholderRect = lastInnerRect_relative.NewWidth(dragBoxRect.width).NewHeight(dragBoxRect.height);
				// if (dragBoxRect.Center.y > firstOffsetInnerRect.Center.y) {
				placeholderRect.y += lastInnerRect.height;
			} else {
				// placeholderRect = new VRect(Vector2.zero, dragBoxRect.Size);
				placeholderRect = new VRect(new Vector2(7, 7), dragBoxRect.Size); // adjust for padding
			}
		}

		if (!placeholderRect.Equals(this.state.placeholderRect)) {
			this.SetState({placeholderRect});
		}
	}
}
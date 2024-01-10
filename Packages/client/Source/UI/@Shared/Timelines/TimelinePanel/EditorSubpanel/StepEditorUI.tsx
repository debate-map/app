import {ToJSON, Vector2, VRect, WaitXThenRun, GetEntries, Clone, DEL, E, CreateStringEnum, emptyArray} from "web-vcore/nm/js-vextensions.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd.js";
import {Button, CheckBox, Column, Pre, Row, Select, Text, TextArea, TimeSpanInput, Spinner} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM, ShallowChanged} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {DragInfo, InfoButton, MakeDraggable, Observer} from "web-vcore";
import {DraggableInfo, DroppableInfo} from "Utils/UI/DNDStructures.js";
import {UUIDPathStub} from "UI/@Shared/UUIDStub.js";
import {CreateAccessor, GetAsync, RunInAction} from "web-vcore/nm/mobx-graphlink.js";
import {VMenuStub, VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {Timeline, GetTimelineStep, IsUserCreatorOrMod, MeID, TimelineStep, NodeReveal, GetNodeID, GetNode, GetNodeL2, GetNodeL3, GetNodeDisplayText, NodeType, SearchUpFromNodeForNodeMatchingX, Map, OrderKey, GetPathNodes, GetNodeLinks} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_AddTimelineStep, RunCommand_DeleteTimelineStep, RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {GetNodeColor} from "Store/db_ext/nodes";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {AudioMeta, GetStepAudioSegmentInfo} from "Utils/OPFS/Map/AudioMeta";
import {store} from "Store";

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

export type StepEditorUIProps = {index: number, map: Map, timeline: Timeline, step: TimelineStep, nextStep: TimelineStep|n, draggable?: boolean} & {dragInfo?: DragInfo};

@MakeDraggable(({index, step, draggable}: StepEditorUIProps)=>{
	if (draggable == false) return null as any; // todo: is this "as any" valid?
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
		const stepStartTimesInAudioFiles = audioFileMetas.map(a=>a.value.stepStartTimes[step.id]).filter(a=>a != null);
		const SetStepStartTimeInAudioFile = async(audioFileName: string, stepID: string, startTime: number|null)=>{
			const newAudioMeta = audioMeta ? Clone(audioMeta) as AudioMeta : new AudioMeta();
			const newAudioFileMeta = AudioMeta.GetOrCreateFileMeta(newAudioMeta, audioFileName);
			if (startTime == null) {
				delete newAudioFileMeta[stepID];
			} else {
				newAudioFileMeta.stepStartTimes[stepID] = startTime;
			}
			await opfsForMap.SaveFile_Text(JSON.stringify(newAudioMeta), "AudioMeta.json");
		};

		const stepAudioSegment = GetStepAudioSegmentInfo(step, nextStep, map.id);
		const stepDurationDerivedFromAudio = stepAudioSegment?.duration;

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
							<Button mdIcon="creation" title={`Derive time from audio file (${stepDurationDerivedFromAudio}s)`} ml={5}
								enabled={creatorOrMod && nextStep != null && stepDurationDerivedFromAudio != null && stepDurationDerivedFromAudio.toFixed(3) != step.timeUntilNextStep?.toFixed(3)} // number stored in db can differ slightly, so round to 1ms
								onClick={()=>{
									RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: null, timeFromLastStep: null, timeUntilNextStep: stepDurationDerivedFromAudio}});
								}}/>
							{/* <Pre>Speaker: </Pre>
							<Select value={} onChange={val=> {}}/> */}
							<Pre ml={5}>Position: </Pre>
							<Select options={positionOptions} value={step.groupID} enabled={creatorOrMod} onChange={val=>{
								RunCommand_UpdateTimelineStep({id: step.id, updates: {groupID: val}});
							}}/>
							<Button ml={5} mdIcon="ray-start-arrow" enabled={creatorOrMod && store.main.timelines.audioPanel.selectedFile != null} onClick={()=>{
								SetStepStartTimeInAudioFile(audioUIState.selectedFile!, step.id, store.main.timelines.audioPanel.selection_start);
							}}/>
							<Button ml={5} mdIcon="delete" enabled={creatorOrMod} onClick={()=>{
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
						</Row>
						{creatorOrMod &&
						<VMenuStub>
							<VMenuItem text="Clone" style={liveSkin.Style_VMenuItem()}
								onClick={e=>{
									if (e.button != 0) return;
									const newTimelineStep = Clone(step);
									newTimelineStep.orderKey = new OrderKey(step.orderKey).next().toString();
									RunCommand_AddTimelineStep(newTimelineStep);
								}}/>
						</VMenuStub>}
					</Row>
					{stepStartTimesInAudioFiles.map((startTime, index)=>{
						const audioFileMeta = audioFileMetas[index];
						return (
							<Row key={index} mt={5} p="1px 5px">
								<Text>{`In audio file "${audioFileMeta.key}": Step start time:`}</Text>
								<TimeSpanInput ml={5} largeUnit="minute" smallUnit="second" style={{width: 80}} enabled={creatorOrMod} value={startTime} onChange={async val=>{
									SetStepStartTimeInAudioFile(audioFileMeta.key, step.id, val);
								}}/>
								<Button ml={5} mdIcon="play" enabled={audioUIState.selectedFile == audioFileMeta.key} onClick={()=>{
									RunInAction("StepEditorUI.playAudio", ()=>{
										//audioUIState.selectedFile = audioFileMeta.key;
										//audioUIState.selection_start = startTime;
										//audioUIState.act_startPlayAtTimeX = Date.now(); // this triggers the wavesurfer to actually start playing
										audioUIState.act_startPlayAtTimeX = startTime;
									});
								}}/>
								<Button ml={5} mdIcon="delete" onClick={()=>{
									SetStepStartTimeInAudioFile(audioFileMeta.key, step.id, null);
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
									{(step.nodeReveals == null || step.nodeReveals.length == 0) && !dragIsOverDropArea &&
									<div style={{fontSize: 11, opacity: 0.7, textAlign: "center"}}>Drag nodes here to have them display when the playback reaches this step.</div>}
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

		this.SetState({placeholderRect});
	}
}

@Observer
export class NodeRevealUI extends BaseComponentPlus({} as {map: Map, step: TimelineStep, nodeReveal: NodeReveal, editing: boolean, index: number}, {detailsOpen: false}) {
	render() {
		const {map, step, nodeReveal, editing, index} = this.props;
		const {detailsOpen} = this.state;

		const {path} = nodeReveal;
		const nodeID = GetNodeID(path);
		let node = GetNodeL2(nodeID);
		let nodeL3 = GetNodeL3(path);
		// if one is null, make them both null to be consistent
		if (node == null || nodeL3 == null) {
			node = null;
			nodeL3 = null;
		}

		const pathNodes = GetPathNodes(path);
		// path is valid if every node in path, has the previous node as a parent
		const pathValid = pathNodes.every((nodeID, index)=>{
			const parentID = pathNodes[index - 1];
			const parentLink = GetNodeLinks(parentID, nodeID)[0];
			return index == 0 || (nodeID && parentID && parentLink != null);
		});

		const displayText = node && nodeL3 ? GetNodeDisplayText(node, nodeReveal.path) : `(Node no longer exists: ${GetNodeID(nodeReveal.path)})`;

		const backgroundColor = GetNodeColor(nodeL3 || {type: NodeType.category} as any).desaturate(0.5).alpha(0.8);
		// if (node == null || nodeL3 == null) return null;
		return (
			<>
				<Row key={index} sel mt={index === 0 ? 0 : 5}
					style={E(
						{width: "100%", padding: 3, background: backgroundColor.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)"},
						// selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
					)}
					onMouseDown={e=>{
						if (e.button !== 2) return false;
						// this.SetState({ menuOpened: true });
					}}
					onClick={()=>this.SetState({detailsOpen: !detailsOpen})}
				>
					<span style={{position: "relative", paddingTop: 2, fontSize: 12, color: "rgba(20,20,20,1)"}}>
						<span style={{
							position: "absolute", left: -5, top: -8, lineHeight: "11px", fontSize: 10, color: "yellow",
							background: "rgba(50,50,50,1)", borderRadius: 5, padding: "0 3px",
						}}>
							{[
								nodeReveal.show && "show",
								nodeReveal.changeFocusLevelTo != null && `focus:${nodeReveal.changeFocusLevelTo}`,
								nodeReveal.setExpandedTo == true && `expand`,
								nodeReveal.setExpandedTo == false && `collapse`,
								nodeReveal.hide && "hide",
							].filter(a=>a).join(", ")}
							{!pathValid && <span style={{marginLeft: 5, color: "red"}}>[path invalid]</span>}
						</span>
						{displayText}
					</span>
					{/* <NodeUI_Menu_Helper {...{map, node}}/> */}
					{/* <NodeUI_Menu_Stub {...{ node: nodeL3, path: `${node.id}`, inList: true }}/> */}
					{editing &&
					<Button ml="auto" mdIcon="delete" style={{margin: -3, padding: "3px 10px"}} onClick={()=>{
						const newNodeReveals = step.nodeReveals.Exclude(nodeReveal);
						RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
					}}/>}
				</Row>
				{detailsOpen &&
				<Column sel mt={5}>
					<Row>
						<Text>Path: </Text>
						<UUIDPathStub path={path}/>
						{!pathValid && editing &&
						<Button ml="auto" text="Fix path" enabled={node != null} onClick={async()=>{
							const newPath = await GetAsync(()=>SearchUpFromNodeForNodeMatchingX(node!.id, id=>id == map.rootNode));
							if (newPath == null) {
								return void ShowMessageBox({title: "Could not find new path", message: "Failed to find new path between map root-node and this step's node."});
							}
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							newNodeReveals[index].path = newPath;
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>}
					</Row>
					{editing &&
					<Row>
						<CheckBox ml={5} text="Show" value={nodeReveal.show ?? false} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							newNodeReveals[index].show = val;
							if (val) newNodeReveals[index].hide = false;
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
						{nodeReveal.show &&
						<>
							<Text ml={10}>Reveal depth:</Text>
							<Spinner ml={5} min={0} max={50} value={nodeReveal.show_revealDepth ?? 0} onChange={val=>{
								const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
								//newNodeReveals[index].VSet("show_revealDepth", val > 0 ? val : DEL);
								newNodeReveals[index].show_revealDepth = val;
								RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
							}}/>
						</>}
					</Row>}
					{editing &&
					<Row>
						<CheckBox ml={5} text="Change focus level to:" value={nodeReveal.changeFocusLevelTo != null} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							if (val) {
								// when manually checking this box, setting to 0 is more common (since setting to 1 is auto-set for newly-dragged reveal-nodes)
								newNodeReveals[index].changeFocusLevelTo = 0;
							} else {
								delete newNodeReveals[index].changeFocusLevelTo;
							}
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
						<InfoButton text="While a node has a focus-level of 1+, the timeline will keep it in view while progressing through its steps (ie. during automatic scrolling and zooming)."/>
						{nodeReveal.changeFocusLevelTo != null &&
						<>
							<Spinner ml={5} value={nodeReveal.changeFocusLevelTo} onChange={val=>{
								const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
								newNodeReveals[index].changeFocusLevelTo = val;
								RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
							}}/>
						</>}
					</Row>}
					{editing &&
					<Row>
						<CheckBox ml={5} text="Set expanded to:" value={nodeReveal.setExpandedTo != null} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							if (val) {
								newNodeReveals[index].setExpandedTo = true;
							} else {
								delete newNodeReveals[index].setExpandedTo;
							}
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
						{nodeReveal.setExpandedTo != null &&
						<>
							<Select ml={5} options={{expanded: true, collapsed: false}} value={nodeReveal.setExpandedTo} onChange={(val: boolean)=>{
								const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
								newNodeReveals[index].setExpandedTo = val;
								RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
							}}/>
						</>}
					</Row>}
					{editing &&
					<Row>
						<CheckBox ml={5} text="Hide" value={nodeReveal.hide ?? false} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							newNodeReveals[index].hide = val;
							if (val) newNodeReveals[index].show = false;
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
					</Row>}
				</Column>}
			</>
		);
	}
}
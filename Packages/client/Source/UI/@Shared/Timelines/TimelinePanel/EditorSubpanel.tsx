import {ToJSON} from "web-vcore/nm/js-vextensions.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd.js";
import ReactList from "react-list";
import {Button, CheckBox, Column, Pre, Row, Spinner, Text, TextInput, TimeSpanInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {TimelineDetailsEditor} from "UI/@Shared/Timelines/TimelineDetailsUI.js";
import {ES, InfoButton, Observer, RunInAction} from "web-vcore";
import {DroppableInfo} from "Utils/UI/DNDStructures.js";
// import {GetOpenMapID} from "Store/main";
import {GetTimelinePanelOpen, GetTimelineOpenSubpanel, GetSelectedTimeline, GetShowTimelineDetails, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {TimelineSubpanel} from "Store/main/maps/mapStates/@MapState.js";
import {Map, Timeline, IsUserCreatorOrMod, MeID, TimelineStep, GetTimelineSteps, OrderKey} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {GetOpenMapID} from "Store/main.js";
import {RunCommand_AddTimelineStep, RunCommand_UpdateTimeline} from "Utils/DB/Command.js";
import {StepEditorUI} from "./EditorSubpanel/StepEditorUI.js";

// for use by react-beautiful-dnd (using text replacement)
G({LockMapEdgeScrolling});
function LockMapEdgeScrolling() {
	const mapID = GetOpenMapID();
	if (mapID == null) return;
	return store.main.maps.lockMapScrolling && GetTimelinePanelOpen(mapID) && GetTimelineOpenSubpanel(mapID) == TimelineSubpanel.editor;
}

@Observer
export class EditorSubpanel extends BaseComponentPlus({} as {map: Map}, {}, {} as {timeline: Timeline|n, timelineSteps: TimelineStep[], creatorOrMod: boolean}) {
	render() {
		const {map} = this.props;
		const mapState = GetMapState.NN(map.id);
		const timeline = GetSelectedTimeline(map?.id);
		if (timeline == null) return null;
		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);
		// timelineSteps: timeline && GetTimelineSteps(timeline, false),
		const showTimelineDetails = GetShowTimelineDetails(map && map.id);
		const uiState = store.main.timelines;
		const uiState_maps = store.main.maps;
		const droppableInfo = new DroppableInfo({type: "TimelineStepList", timelineID: timeline ? timeline.id : null});

		const timelineSteps = GetTimelineSteps(timeline.id);

		this.Stash({timeline, timelineSteps, creatorOrMod});
		if (timeline == null) return null;
		return (
			<>
				<Row center mlr={5} style={{minHeight: 25}}>
					{creatorOrMod && <>
						<Text>Add: </Text>
						<Button ml={5} text="Video" enabled={timeline != null && timeline.videoID == null} onClick={()=>{
							if (MeID() == null) return ShowSignInPopup();
							RunCommand_UpdateTimeline({id: timeline.id, updates: {videoID: ""}});
						}}/>
						<Button ml={5} text="Statement" enabled={timeline != null} onClick={()=>{
							if (MeID() == null) return ShowSignInPopup();
							// calculate the insert-index to be just after the middle entry of the visible-step-range
							const visibleStepRange = this.stepList?.getVisibleRange() ?? [timelineSteps.length - 1, timelineSteps.length - 1];
							const insertIndex = Math.floor(visibleStepRange.Average() + 1);
							const prevStep = timelineSteps[insertIndex];
							const nextStep = timelineSteps[insertIndex + 1];

							const newStep = new TimelineStep({
								timelineID: timeline.id,
								orderKey: OrderKey.between(prevStep?.orderKey, nextStep?.orderKey).toString(),
								groupID: "full",
								message: "",
								nodeReveals: [],
							});
							RunCommand_AddTimelineStep(newStep);
						}}/>
					</>}
					<CheckBox ml={5} text="Details" value={showTimelineDetails} onChange={val=>{
						RunInAction("EditorSubpanel.Details.onChange", ()=>mapState.showTimelineDetails = val);
					}}/>
					<CheckBox ml="auto" text="Audio mode" title="Special UI mode, where map-ui is replaced with panel where audio file can be dragged and viewed, for splicing onto timeline-steps." value={uiState.audioMode} onChange={val=>{
						RunInAction("EditorSubpanel.audioMode.onChange", ()=>uiState.audioMode = val);
					}}/>
					<CheckBox ml={5} text="Lock map scrolling" title="Lock map edge-scrolling. (for dragging onto timeline steps)" value={uiState_maps.lockMapScrolling} onChange={val=>{
						RunInAction("EditorSubpanel.lockMapScrolling.onChange", ()=>uiState_maps.lockMapScrolling = val);
					}}/>
				</Row>
				<ScrollView className="brightScrollBars" style={ES({flex: 1})}
					contentStyle={ES({
						flex: 1, position: "relative", padding: 7,
						//filter: 'drop-shadow(rgb(0, 0, 0) 0px 0px 10px)', // disabled for now, since otherwise causes issue with dnd system (and portal fix causes errors here, fsr)
						background: "rgba(0,0,0,1)",
					})}
					scrollVBarStyle={{filter: "none", width: 7}} // width:7 to match with container padding
				>
					{showTimelineDetails &&
					<TimelineDetailsEditor timeline={timeline} editing={creatorOrMod}/>}
					{timeline.videoID != null &&
					<Row center mb={7} p="7px 10px" style={{background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10, border: "1px solid rgba(255,255,255,.15)"}}>
						<Pre>Video ID: </Pre>
						<TextInput value={timeline.videoID} enabled={creatorOrMod} onChange={val=>{
							RunCommand_UpdateTimeline({id: timeline.id, updates: {videoID: val}});
						}}/>
						<CheckBox ml={5} text="Start: " value={timeline.videoStartTime != null} enabled={creatorOrMod} onChange={val=>{
							if (val) {
								RunCommand_UpdateTimeline({id: timeline.id, updates: {videoStartTime: 0}});
							} else {
								RunCommand_UpdateTimeline({id: timeline.id, updates: {videoStartTime: null}});
							}
						}}/>
						<TimeSpanInput mr={5} largeUnit="minute" smallUnit="second" style={{width: 60}}
							enabled={creatorOrMod && timeline.videoStartTime != null} value={timeline.videoStartTime ?? 0}
							onChange={val=>RunCommand_UpdateTimeline({id: timeline.id, updates: {videoStartTime: val}})}/>
						<Row center>
							<Text>Height</Text>
							<InfoButton text={`
								The height, as a percentage of the width.

								4:3 = 75%
								16:9 = 56.25%
							`.AsMultiline(0)}/>
							<Text>: </Text>
						</Row>
						<Spinner min={0} max={100} step={0.01} style={{width: 62}} value={((timeline.videoHeightVSWidthPercent ?? 0) * 100).RoundTo(0.01)} enabled={creatorOrMod} onChange={val=>{
							RunCommand_UpdateTimeline({id: timeline.id, updates: {videoHeightVSWidthPercent: (val / 100).RoundTo(0.0001)}});
						}}/>
						<Pre>%</Pre>
						<Button ml="auto" text="X" enabled={creatorOrMod} onClick={()=>{
							ShowMessageBox({
								title: "Delete video attachment", cancelButton: true,
								message: "Remove the video attachment for this timeline?",
								onOK: ()=>{
									RunCommand_UpdateTimeline({id: timeline.id, updates: {videoID: null}});
								},
							});
						}}/>
					</Row>}
					<Droppable type="TimelineStep" droppableId={ToJSON(droppableInfo.VSet({timelineID: timeline.id}))} isDropDisabled={!creatorOrMod}>
						{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>(
							<Column ref={c=>provided.innerRef(GetDOM(c) as any)} {...provided.droppableProps}>
								{/* timelineSteps && timelineSteps.map((step, index) => {
									if (step == null) return null;
									return <StepUI key={index} index={index} last={index == timeline.steps.length - 1} map={map} timeline={timeline} step={step}/>;
								}) */}
								<ReactList ref={c=>this.stepList = c} type='variable' length={timelineSteps.length} itemSizeEstimator={this.EstimateStepHeight} itemRenderer={this.RenderStep}/>
							</Column>
						)}
					</Droppable>
				</ScrollView>
			</>
		);
	}
	stepList: ReactList|n;

	EstimateStepHeight = (index: number, cache: any)=>{
		return 100;
	};
	RenderStep = (index: number, key: any)=>{
		const {map, timeline, timelineSteps, creatorOrMod} = this.PropsStash;
		const step = timelineSteps[index];
		const nextStep = timelineSteps[index + 1];
		return <StepEditorUI key={step.id} index={index} map={map} timeline={timeline!} step={step} nextStep={nextStep} draggable={creatorOrMod}/>;
	};
}
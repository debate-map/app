import {ToJSON} from "web-vcore/nm/js-vextensions";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd";
import ReactList from "react-list";
import {Button, CheckBox, Column, Pre, Row, Spinner, Text, TextInput, TimeSpanInput} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {ScrollView} from "web-vcore/nm/react-vscrollview";
import {store} from "Store";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {TimelineDetailsEditor} from "UI/@Shared/Timelines/TimelineDetailsUI";
import {InfoButton, Observer} from "web-vcore";
import {DroppableInfo} from "Utils/UI/DNDStructures";
import {ES} from "Utils/UI/GlobalStyles";
import {GetOpenMapID} from "Store/main";
import {GetTimelinePanelOpen, GetTimelineOpenSubpanel, GetSelectedTimeline, GetShowTimelineDetails, GetMapState} from "Store/main/maps/mapStates/$mapState";
import {runInAction} from "web-vcore/nm/mobx";
import {TimelineSubpanel} from "Store/main/maps/mapStates/@MapState";
import {StepEditorUI} from "./EditorSubpanel/StepEditorUI";
import {Map} from "dm_common";
import {Timeline} from "dm_common";
import {IsUserCreatorOrMod} from "dm_common";
import {MeID} from "dm_common";
import {UpdateTimeline} from "dm_common";
import {TimelineStep} from "dm_common";
import {AddTimelineStep} from "dm_common";

// for use by react-beautiful-dnd (using text replacement)
G({LockMapEdgeScrolling});
function LockMapEdgeScrolling() {
	const mapID = GetOpenMapID();
	return store.main.maps.lockMapScrolling && GetTimelinePanelOpen(mapID) && GetTimelineOpenSubpanel(mapID) == TimelineSubpanel.Editor;
}

@Observer
export class EditorSubpanel extends BaseComponentPlus({} as {map: Map}, {}, {} as {timeline: Timeline, creatorOrMod: boolean}) {
	render() {
		const {map} = this.props;
		const timeline = GetSelectedTimeline(map && map.id);
		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);
		// timelineSteps: timeline && GetTimelineSteps(timeline, false),
		const showTimelineDetails = GetShowTimelineDetails(map && map.id);
		const {lockMapScrolling} = store.main.maps;
		const droppableInfo = new DroppableInfo({type: "TimelineStepList", timelineID: timeline ? timeline.id : null});

		this.Stash({timeline, creatorOrMod});
		if (timeline == null) return null;
		return (
			<>
				<Row center mlr={5} style={{minHeight: 25}}>
					{creatorOrMod && <>
						<Text>Add: </Text>
						<Button ml={5} text="Video" enabled={timeline != null && timeline.videoID == null} onClick={()=>{
							if (MeID() == null) return ShowSignInPopup();
							new UpdateTimeline({id: timeline.id, updates: {videoID: ""}}).Run();
						}}/>
						<Button ml={5} text="Statement" enabled={timeline != null} onClick={()=>{
							if (MeID() == null) return ShowSignInPopup();
							const lastVisibleStepIndex = this.stepList.getVisibleRange()[1];
							const newStepIndex = lastVisibleStepIndex == timeline.steps.length - 1 ? null : lastVisibleStepIndex;

							const newStep = new TimelineStep({});
							new AddTimelineStep({timelineID: timeline.id, step: newStep, stepIndex: newStepIndex}).Run();
						}}/>
					</>}
					<CheckBox ml={5} text="Details" value={showTimelineDetails} onChange={val=>{
						runInAction("EditorSubpanel.Details.onChange", ()=>GetMapState(map.id).showTimelineDetails = val);
					}}/>
					<CheckBox ml="auto" text="Lock map scrolling" title="Lock map edge-scrolling. (for dragging onto timeline steps)" value={lockMapScrolling} onChange={val=>{
						runInAction("EditorSubpanel.lockMapScrolling.onChange", ()=>store.main.maps.lockMapScrolling = val);
					}}/>
				</Row>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({
					flex: 1, position: "relative", padding: 7,
					// filter: 'drop-shadow(rgb(0, 0, 0) 0px 0px 10px)', // disabled for now, since otherwise causes issue with dnd system (and portal fix causes errors here, fsr)
				})}>
					{showTimelineDetails &&
					<TimelineDetailsEditor timeline={timeline} editing={creatorOrMod}/>}
					{timeline.videoID != null &&
					<Row center mb={7} p="7px 10px" style={{background: "rgba(0,0,0,.7)", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)"}}>
						<Pre>Video ID: </Pre>
						<TextInput value={timeline.videoID} enabled={creatorOrMod} onChange={val=>{
							new UpdateTimeline({id: timeline.id, updates: {videoID: val}}).Run();
						}}/>
						<CheckBox ml={5} text="Start: " value={timeline.videoStartTime != null} enabled={creatorOrMod} onChange={val=>{
							if (val) {
								new UpdateTimeline({id: timeline.id, updates: {videoStartTime: 0}}).Run();
							} else {
								new UpdateTimeline({id: timeline.id, updates: {videoStartTime: null}}).Run();
							}
						}}/>
						<TimeSpanInput mr={5} largeUnit="minute" smallUnit="second" style={{width: 60}}
							enabled={creatorOrMod && timeline.videoStartTime != null} value={timeline.videoStartTime}
							onChange={val=>new UpdateTimeline({id: timeline.id, updates: {videoStartTime: val}}).Run()}/>
						<Row center>
							<Text>Height</Text>
							<InfoButton text={`
								The height, as a percentage of the width.

								4:3 = 75%
								16:9 = 56.25%
							`.AsMultiline(0)}/>
							<Text>: </Text>
						</Row>
						<Spinner min={0} max={100} step={0.01} style={{width: 62}} value={(timeline.videoHeightVSWidthPercent * 100).RoundTo(0.01)} enabled={creatorOrMod} onChange={val=>{
							new UpdateTimeline({id: timeline.id, updates: {videoHeightVSWidthPercent: (val / 100).RoundTo(0.0001)}}).Run();
						}}/>
						<Pre>%</Pre>
						<Button ml="auto" text="X" enabled={creatorOrMod} onClick={()=>{
							ShowMessageBox({
								title: "Delete video attachment", cancelButton: true,
								message: "Remove the video attachment for this timeline?",
								onOK: ()=>{
									new UpdateTimeline({id: timeline.id, updates: {videoID: null}}).Run();
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
								<ReactList ref={c=>this.stepList = c} type='variable' length={timeline.steps.length} itemSizeEstimator={this.EstimateStepHeight} itemRenderer={this.RenderStep}/>
							</Column>
						)}
					</Droppable>
				</ScrollView>
			</>
		);
	}
	stepList: ReactList;

	EstimateStepHeight = (index: number, cache: any)=>{
		return 100;
	};
	RenderStep = (index: number, key: any)=>{
		const {map, timeline, creatorOrMod} = this.PropsStash;
		const stepID = timeline.steps[index];
		return <StepEditorUI key={stepID} index={index} last={index == timeline.steps.length - 1} map={map} timeline={timeline} stepID={stepID} draggable={creatorOrMod}/>;
	};
}
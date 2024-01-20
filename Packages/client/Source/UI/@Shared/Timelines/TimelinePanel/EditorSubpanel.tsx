import {DroppableInfo} from "Utils/UI/DNDStructures.js";
import ReactList from "react-list";
import {ES, Observer} from "web-vcore";
import {ToJSON} from "web-vcore/nm/js-vextensions.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd.js";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
// import {GetOpenMapID} from "Store/main";
import {GetSelectedTimeline} from "Store/main/maps/mapStates/$mapState.js";
import {GetTimelineSteps, IsUserCreatorOrMod, Map, MeID, Timeline, TimelineStep} from "dm_common";
import {StepEditorUI} from "./EditorSubpanel/StepEditorUI.js";

@Observer
export class EditorSubpanel extends BaseComponentPlus({} as {map: Map}, {}, {} as {timeline: Timeline|n, timelineSteps: TimelineStep[], creatorOrMod: boolean}) {
	render() {
		const {map} = this.props;
		const timeline = GetSelectedTimeline(map?.id);
		if (timeline == null) return null;
		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);
		// timelineSteps: timeline && GetTimelineSteps(timeline, false),
		const droppableInfo = new DroppableInfo({type: "TimelineStepList", timelineID: timeline ? timeline.id : null});

		const timelineSteps = GetTimelineSteps(timeline.id);

		this.Stash({timeline, timelineSteps, creatorOrMod});
		if (timeline == null) return null;
		return (
			<>
				<ScrollView className="brightScrollBars" style={ES({flex: 1})}
					contentStyle={ES({
						flex: 1, position: "relative", padding: 7,
						//filter: 'drop-shadow(rgb(0, 0, 0) 0px 0px 10px)', // disabled for now, since otherwise causes issue with dnd system (and portal fix causes errors here, fsr)
						background: "rgba(0,0,0,1)",
					})}
					scrollVBarStyle={{filter: "none", width: 7}} // width:7 to match with container padding
				>
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
import {Map} from "../../../../../Store/firebase/maps/@Map";
import {Connect} from "Frame/Database/FirebaseConnect";
import {BaseComponent} from "react-vextensions";
import {GetUserID} from "Store/firebase/users";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {DropDown, DropDownTrigger, DropDownContent, Pre} from "react-vcomponents";
import {Button} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {Column} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {TimelineStep} from "../../../../../Store/firebase/timelineSteps/@TimelineStep";
import {GetMapTimelines, GetTimeline, GetTimelineSteps} from "../../../../../Store/firebase/timelines";
import {Timeline} from "../../../../../Store/firebase/timelines/@Timeline";
import {ShowAddTimelineDialog} from "../../../Timelines/AddTimelineDialog";
import { ACTMap_SelectedTimelineSet } from "Store/main/maps/$map";
import AddTimelineStep from "Server/Commands/AddTimelineStep";
import {Select} from "react-vcomponents";
import {UpdateTimelineStep} from "../../../../../Server/Commands/UpdateTimelineStep";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {RemoveHelpers} from "../../../../../Frame/Database/DatabaseHelpers";
import DeleteTimelineStep from "Server/Commands/DeleteTimelineStep";
import DeleteTimeline from "../../../../../Server/Commands/DeleteTimeline";
import {TextInput} from "react-vcomponents";
import {ShowEditTimelineStepDialog} from "../../../Timelines/Steps/TimelineStepDetailsUI";
import {ACTMap_PlayingTimelineAppliedStepSet, ACTMap_PlayingTimelineStepSet, ACTMap_PlayingTimelineSet} from "../../../../../Store/main/maps/$map";

type TimelineDropDownProps = {map: Map} & Partial<{timelines: Timeline[], selectedTimeline: Timeline, selectedTimelineSteps: TimelineStep[]}>;
@Connect((state, {map}: TimelineDropDownProps)=> {
	let selectedTimelineID = State("main", "maps", map._id, "selectedTimeline");
	let timeline = GetTimeline(selectedTimelineID);
	return {
		timelines: GetMapTimelines(map),
		selectedTimeline: timeline,
		selectedTimelineSteps: timeline && GetTimelineSteps(timeline),
	};
})
export class TimelineDropDown extends BaseComponent<TimelineDropDownProps, {}> {
	timelineSelect: DropDown;
	render() {
		let {map, timelines, selectedTimeline, selectedTimelineSteps} = this.props;
		let userID = GetUserID();
		let creatorOrMod = IsUserCreatorOrMod(userID, map);
		return (
			<DropDown>
				<DropDownTrigger><Button ml={5} text="Timeline"/></DropDownTrigger>
				<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null}}>
					<Row style={{alignItems: "flex-start"}}>
						<Column style={{width: 600}}>
							<Column className="clickThrough" style={{height: 40, background: "rgba(0,0,0,.7)", /*borderRadius: "10px 10px 0 0"*/}}>
								<Row style={{height: 40, padding: 10}}>
									<DropDown ref={c=>this.timelineSelect = c}>
										<DropDownTrigger><Button text={selectedTimeline ? selectedTimeline.name : "[none]"}/></DropDownTrigger>
										<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null, zIndex: 1}}>
											<Row style={{alignItems: "flex-start"}}>
												<Column style={{width: 600}}>
													<ScrollView style={{flex: 1}} contentStyle={{flex: .8, position: "relative", maxHeight: 500}}>
														{timelines.map((timeline, index)=> {
															return (
																<Column p="7px 10px"
																		style={E(
																			{
																				cursor: "pointer",
																				background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"
																			},
																			index == timelines.length - 1 && {borderRadius: "0 0 10px 10px"}
																		)}
																		onClick={()=> {
																			store.dispatch(new ACTMap_SelectedTimelineSet({mapID: map._id, selectedTimeline: timeline._id}));
																			this.timelineSelect.hide();
																		}}>
																	<Row>
																		<Pre>{timeline.name} </Pre><span style={{fontSize: 11}}>(id: {timeline._id})</span>
																	</Row>
																</Column>
															);
														})}
													</ScrollView>
												</Column>
											</Row>
										</DropDownContent>
									</DropDown>
									<Button ml={5} text="X" title="Delete timeline" enabled={selectedTimeline != null && selectedTimeline.steps == null} onClick={()=> {
										new DeleteTimeline({timelineID: selectedTimeline._id}).Run();
									}}/>
									<Button ml={5} text="+" title="Add new timeline" onClick={()=> {
										if (userID == null) return ShowSignInPopup();
										ShowAddTimelineDialog(userID, map._id);
									}}/>
									<Button ml="auto" text="Play" title="Start playing this timeline" enabled={selectedTimeline != null} style={{flexShrink: 0}} onClick={()=> {
										store.dispatch(new ACTMap_PlayingTimelineSet({mapID: map._id, timelineID: selectedTimeline._id}));
										store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: 0}));
										store.dispatch(new ACTMap_PlayingTimelineAppliedStepSet({mapID: map._id, step: null}));
									}}/>
									<Button ml={5} text="Add step" enabled={selectedTimeline != null} onClick={()=> {
										if (userID == null) return ShowSignInPopup();
										let newStep = new TimelineStep({});
										new AddTimelineStep({timelineID: selectedTimeline._id, step: newStep}).Run();
									}}/>
								</Row>
							</Column>
							<ScrollView style={{flex: 1}} contentStyle={{flex: 1, position: "relative", maxHeight: 500, borderRadius: "0 0 10px 10px"}}>
								{selectedTimelineSteps && selectedTimelineSteps.map((step, index)=> {
									return <StepUI index={index} last={index == selectedTimeline.steps.length - 1} map={map} step={step}/>
								})}
							</ScrollView>
						</Column>
					</Row>
				</DropDownContent>
			</DropDown>
		);
	}
}

type StepUIProps = {index: number, last: boolean, map: Map, step: TimelineStep} & Partial<{}>;
@Connect((state, {map, step}: StepUIProps)=> ({
}))
class StepUI extends BaseComponent<StepUIProps, {}> {
	render() {
		let {index, last, map, step} = this.props;
		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), map);
		return (
			<Column p="7px 10px" style={E(
				{
					//background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
					background: "rgba(0,0,0,.7)",
					borderTop: "1px solid rgba(255,255,255,.3)",
				},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
				<Row>
					<Row style={{flexShrink: 0}}>Step {index + 1}:</Row>
					<Row ml={5}>{step.message}</Row>
					<Button ml={5} text="Edit" title="Edit this step" style={{flexShrink: 0}} onClick={()=> {
						ShowEditTimelineStepDialog(GetUserID(), step);
					}}/>
					<Button ml={5} text="X" onClick={()=> {
						new DeleteTimelineStep({stepID: step._id}).Run();
					}}/>
				</Row>
			</Column>
		);
	}
}
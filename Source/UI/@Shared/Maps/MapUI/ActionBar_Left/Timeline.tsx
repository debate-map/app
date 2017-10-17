import {Map} from "../../../../../Store/firebase/maps/@Map";
import {Connect} from "Frame/Database/FirebaseConnect";
import {BaseComponent} from "../../../../../Frame/UI/ReactGlobals";
import {GetUserID} from "Store/firebase/users";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import DropDown from "../../../../../Frame/ReactComponents/DropDown";
import {DropDownTrigger, DropDownContent} from "../../../../../Frame/ReactComponents/DropDown";
import Button from "Frame/ReactComponents/Button";
import Row from "Frame/ReactComponents/Row";
import Column from "../../../../../Frame/ReactComponents/Column";
import ScrollView from "react-vscrollview";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {TimelineStep, TimelineStepAction, TimelineStepActionType} from "../../../../../Store/firebase/timelineSteps/@TimelineStep";
import {GetMapTimelines, GetTimeline, GetTimelineSteps} from "../../../../../Store/firebase/timelines";
import {Timeline} from "../../../../../Store/firebase/timelines/@Timeline";
import {ShowAddTimelineDialog} from "../../../Timelines/AddTimelineDialog";
import { ACTMap_SelectedTimelineSet } from "Store/main/maps/$map";
import AddTimelineStep from "Server/Commands/AddTimelineStep";
import Select from "../../../../../Frame/ReactComponents/Select";
import {UpdateTimelineStep} from "../../../../../Server/Commands/UpdateTimelineStep";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {RemoveHelpers} from "../../../../../Frame/Database/DatabaseHelpers";
import DeleteTimelineStep from "Server/Commands/DeleteTimelineStep";
import DeleteTimeline from "../../../../../Server/Commands/DeleteTimeline";

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
						<Column style={{width: 600, maxHeight: 350}}>
							<Column className="clickThrough" style={{height: 40, background: "rgba(0,0,0,.7)", /*borderRadius: "10px 10px 0 0"*/}}>
								<Row style={{height: 40, padding: 10}}>
									<DropDown ref={c=>this.timelineSelect = c}>
										<DropDownTrigger><Button text={selectedTimeline ? selectedTimeline.name : "[none]"}/></DropDownTrigger>
										<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null, zIndex: 1}}>
											<Row style={{alignItems: "flex-start"}}>
												<Column style={{width: 600, maxHeight: 350}}>
													<ScrollView style={{flex: 1}} contentStyle={{flex: 1, position: "relative"}}>
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
																		{timeline.name}
																	</Row>
																</Column>
															);
														})}
													</ScrollView>
												</Column>
											</Row>
										</DropDownContent>
									</DropDown>
									<Button ml={5} text="X" enabled={selectedTimeline != null && selectedTimeline.steps == null} onClick={()=> {
										new DeleteTimeline({timelineID: selectedTimeline._id}).Run();
									}}/>
									<Button ml={5} text="+" title="Add new timeline" onClick={()=> {
										if (userID == null) return ShowSignInPopup();
										ShowAddTimelineDialog(userID, map._id);
									}}/>
									<Button ml="auto" text="Add step" enabled={selectedTimeline != null} onClick={()=> {
										if (userID == null) return ShowSignInPopup();
										let newStep = new TimelineStep({});
										new AddTimelineStep({timelineID: selectedTimeline._id, step: newStep}).Run();
									}}/>
								</Row>
							</Column>
							<ScrollView style={{flex: 1}} contentStyle={{flex: 1, position: "relative"}}>
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
				{step.actions && step.actions.map((action, index)=> {
					return <StepActionUI step={step} action={action} index={index}/>;
				})}
				{!step.actions &&
					<Row>
						<Button ml="auto" text="Delete step" onClick={()=> {
							new DeleteTimelineStep({stepID: step._id}).Run();
						}}/>
						<Button ml={5} text="+" title="Add an action to this step" onClick={()=> {
							var newActions = [new TimelineStepAction({stepID: step._id})];
							new UpdateTimelineStep({stepID: step._id, stepUpdates: {actions: newActions}}).Run();
						}}/>
					</Row>}
			</Column>
		);
	}
}

class StepActionUI extends BaseComponent<{step: TimelineStep, action: TimelineStepAction, index: number}, {}> {
	render() {
		let {step, action, index} = this.props;
		return (
			<Row>
				<Select options={GetEntries(TimelineStepActionType)} value={action.type} onChange={val=> {
					let newActions = RemoveHelpers(Clone(step.actions));
					newActions[index].type = val;
					new UpdateTimelineStep({stepID: step._id, stepUpdates: {actions: newActions}}).Run();
				}}/>
				<Button ml="auto" text="X" title="Delete this action" onClick={()=> {
					let newActions = RemoveHelpers(Clone(step.actions));
					newActions.splice(index, 1);
					new UpdateTimelineStep({stepID: step._id, stepUpdates: {actions: newActions}}).Run();
				}}/>
				<Button ml={5} text="+" title="Add another action to this step" onClick={()=> {
					let newActions = RemoveHelpers(Clone(step.actions));
					newActions = newActions.concat(new TimelineStepAction({stepID: step._id}));
					new UpdateTimelineStep({stepID: step._id, stepUpdates: {actions: newActions}}).Run();
				}}/>
			</Row>
		);
	}
}
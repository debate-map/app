import {GetTimelines, GetTimelineStep, GetTimelineSteps, Map, MeID} from "dm_common";
import React from "react";
import {GetMapState, GetSelectedTimeline} from "Store/main/maps/mapStates/$mapState.js";
import {MapUIWaitMessage} from "UI/@Shared/Maps/MapUI";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {ShowAddTimelineDialog} from "UI/@Shared/Timelines/AddTimelineDialog.js";
import {RunCommand_DeleteTimeline} from "Utils/DB/Command";
import {liveSkin} from "Utils/Styles/SkinManager";
import {ES, Observer, RunInAction} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";

@Observer
export class CollectionSubpanel extends BaseComponentPlus({} as {map: Map}, {}) {
	timelineSelect: DropDown|n;
	render() {
		const {map} = this.props;
		const timelines = GetTimelines(map.id);
		const timeline = GetSelectedTimeline(map.id);
		if (timeline == null) return <MapUIWaitMessage message="Timeline is private/deleted."/>;
		const steps = GetTimelineSteps(timeline.id);

		return (
			<Row style={{height: 40, padding: 10}}>
				<DropDown ref={c=>this.timelineSelect = c}>
					<DropDownTrigger><Button text={timeline ? timeline.name : "[none]"}/></DropDownTrigger>
					<DropDownContent style={{position: "fixed", left: 0, padding: null, background: null, borderRadius: null, zIndex: 1}}>
						<Row style={{alignItems: "flex-start"}}>
							<Column style={{width: 600}}>
								<ScrollView style={ES({flex: 1})} contentStyle={{flex: 0.8, position: "relative", maxHeight: 500}}>
									{timelines.map((timeline, index)=>(
										<Column key={index} p="7px 10px"
											style={E(
												{
													cursor: "pointer",
													background: index % 2 == 0 ? "rgba(30,30,30,.7)" : liveSkin.BasePanelBackgroundColor().css(),
												},
												index == timelines.length - 1 && {borderRadius: "0 0 10px 10px"},
											)}
											onClick={()=>{
												const mapState = GetMapState(map.id);
												if (mapState) RunInAction("CollectionSubpanel.selectedTimeline.onChange", ()=>mapState.selectedTimeline = timeline.id);
												if (this.timelineSelect) this.timelineSelect.Hide();
											}}>
											<Row>
												<Pre>{timeline.name}</Pre><span style={{fontSize: 11}}>(id: {timeline.id})</span>
											</Row>
										</Column>
									))}
								</ScrollView>
							</Column>
						</Row>
					</DropDownContent>
				</DropDown>
				<Button ml={5} text="X" title="Delete timeline" enabled={timeline != null && steps.length == 0} onClick={async()=>{
					await RunCommand_DeleteTimeline({id: timeline.id});
				}} />
				<Button ml={5} text="+" title="Add new timeline" onClick={()=>{
					const meID = MeID();
					if (meID == null) return ShowSignInPopup();
					ShowAddTimelineDialog(meID, map.id);
				}} />
				{/* <Button ml="auto" text="Play" title="Start playing this timeline" enabled={selectedTimeline != null} style={{ flexShrink: 0 }} onClick={() => {
					store.dispatch(new ACTMap_PlayingTimelineSet({ mapID: map.id, timelineID: selectedTimeline.id }));
					store.dispatch(new ACTMap_PlayingTimelineStepSet({ mapID: map.id, stepIndex: 0 }));
					store.dispatch(new ACTMap_PlayingTimelineAppliedStepSet({ mapID: map.id, stepIndex: null }));
				}}/> */}
			</Row>
		);
	}
}
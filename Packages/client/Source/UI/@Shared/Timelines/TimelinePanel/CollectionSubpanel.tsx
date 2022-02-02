// import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row} from "web-vcore/nm/react-vcomponents.js";
// import {BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
// import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
// import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
// import {ShowAddTimelineDialog} from "UI/@Shared/Timelines/AddTimelineDialog.js";
// import {GetSelectedTimeline, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
// import {store} from "Store";
// import {Observer} from "web-vcore";
// import {runInAction} from "web-vcore/nm/mobx.js";
// import {E} from "web-vcore/nm/js-vextensions.js";
// import {GetMapTimelines, DeleteTimeline, MeID, Map} from "dm_common";
// 
// @Observer
// export class CollectionSubpanel extends BaseComponentPlus({} as {map: Map}, {}) {
// 	timelineSelect: DropDown;
// 	render() {
// 		const {map} = this.props;
// 		const timelines = GetMapTimelines(map);
// 		const timeline = GetSelectedTimeline(map.id);

// 		return (
// 			<Row style={{height: 40, padding: 10}}>
// 				<DropDown ref={c=>this.timelineSelect = c}>
// 					<DropDownTrigger><Button text={timeline ? timeline.name : "[none]"}/></DropDownTrigger>
// 					<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null, zIndex: 1}}>
// 						<Row style={{alignItems: "flex-start"}}>
// 							<Column style={{width: 600}}>
// 								<ScrollView style={ES({flex: 1})} contentStyle={{flex: 0.8, position: "relative", maxHeight: 500}}>
// 									{timelines.map((timeline, index)=>(
// 										<Column key={index} p="7px 10px"
// 											style={E(
// 												{
// 													cursor: "pointer",
// 													background: index % 2 == 0 ? "rgba(30,30,30,.7)" : liveSkin.MainBackgroundColor().css(),
// 												},
// 												index == timelines.length - 1 && {borderRadius: "0 0 10px 10px"},
// 											)}
// 											onClick={()=>{
// 												RunInAction("CollectionSubpanel.selectedTimeline.onChange", ()=>GetMapState(map.id).selectedTimeline = timeline.id);
// 												this.timelineSelect.Hide();
// 											}}>
// 											<Row>
// 												<Pre>{timeline.name}</Pre><span style={{fontSize: 11}}>(id: {timeline.id})</span>
// 											</Row>
// 										</Column>
// 									))}
// 								</ScrollView>
// 							</Column>
// 						</Row>
// 					</DropDownContent>
// 				</DropDown>
// 				<Button ml={5} text="X" title="Delete timeline" enabled={timeline != null && timeline.steps == null} onClick={()=>{
// 					new DeleteTimeline({timelineID: timeline.id}).RunOnServer();
// 				}} />
// 				<Button ml={5} text="+" title="Add new timeline" onClick={()=>{
// 					if (MeID() == null) return ShowSignInPopup();
// 					ShowAddTimelineDialog(MeID(), map.id);
// 				}} />
// 				{/* <Button ml="auto" text="Play" title="Start playing this timeline" enabled={selectedTimeline != null} style={{ flexShrink: 0 }} onClick={() => {
// 					store.dispatch(new ACTMap_PlayingTimelineSet({ mapID: map.id, timelineID: selectedTimeline.id }));
// 					store.dispatch(new ACTMap_PlayingTimelineStepSet({ mapID: map.id, stepIndex: 0 }));
// 					store.dispatch(new ACTMap_PlayingTimelineAppliedStepSet({ mapID: map.id, stepIndex: null }));
// 				}}/> */}
// 			</Row>
// 		);
// 	}
// }
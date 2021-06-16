import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {ScrollView} from "web-vcore/nm/react-vscrollview";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {ShowAddTimelineDialog} from "UI/@Shared/Timelines/AddTimelineDialog";
import {GetSelectedTimeline, GetMapState} from "Store/main/maps/mapStates/$mapState";
import {store} from "Store";
import {Observer} from "web-vcore";
import {runInAction} from "web-vcore/nm/mobx";
import {E} from "web-vcore/nm/js-vextensions";
import {GetMapTimelines, DeleteTimeline, MeID, Map} from "@debate-map/server-link/Source/Link";
import {ES} from "Utils/UI/GlobalStyles";

@Observer
export class CollectionSubpanel extends BaseComponentPlus({} as {map: Map}, {}) {
	timelineSelect: DropDown;
	render() {
		const {map} = this.props;
		const timelines = GetMapTimelines(map);
		const timeline = GetSelectedTimeline(map._key);

		return (
			<Row style={{height: 40, padding: 10}}>
				<DropDown ref={c=>this.timelineSelect = c}>
					<DropDownTrigger><Button text={timeline ? timeline.name : "[none]"}/></DropDownTrigger>
					<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null, zIndex: 1}}>
						<Row style={{alignItems: "flex-start"}}>
							<Column style={{width: 600}}>
								<ScrollView style={ES({flex: 1})} contentStyle={{flex: 0.8, position: "relative", maxHeight: 500}}>
									{timelines.map((timeline, index)=>(
										<Column key={index} p="7px 10px"
											style={E(
												{
													cursor: "pointer",
													background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
												},
												index == timelines.length - 1 && {borderRadius: "0 0 10px 10px"},
											)}
											onClick={()=>{
												runInAction("CollectionSubpanel.selectedTimeline.onChange", ()=>GetMapState(map._key).selectedTimeline = timeline._key);
												this.timelineSelect.Hide();
											}}>
											<Row>
												<Pre>{timeline.name}</Pre><span style={{fontSize: 11}}>(id: {timeline._key})</span>
											</Row>
										</Column>
									))}
								</ScrollView>
							</Column>
						</Row>
					</DropDownContent>
				</DropDown>
				<Button ml={5} text="X" title="Delete timeline" enabled={timeline != null && timeline.steps == null} onClick={()=>{
					new DeleteTimeline({timelineID: timeline._key}).Run();
				}} />
				<Button ml={5} text="+" title="Add new timeline" onClick={()=>{
					if (MeID() == null) return ShowSignInPopup();
					ShowAddTimelineDialog(MeID(), map._key);
				}} />
				{/* <Button ml="auto" text="Play" title="Start playing this timeline" enabled={selectedTimeline != null} style={{ flexShrink: 0 }} onClick={() => {
					store.dispatch(new ACTMap_PlayingTimelineSet({ mapID: map._key, timelineID: selectedTimeline._key }));
					store.dispatch(new ACTMap_PlayingTimelineStepSet({ mapID: map._key, stepIndex: 0 }));
					store.dispatch(new ACTMap_PlayingTimelineAppliedStepSet({ mapID: map._key, stepIndex: null }));
				}}/> */}
			</Row>
		);
	}
}
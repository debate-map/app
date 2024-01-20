// import {GetTimelines, GetTimelineStep, GetTimelineSteps, IsUserCreatorOrMod, Map, MeID, OrderKey, TimelineStep} from "dm_common";
// import React from "react";
// import {GetMapState, GetSelectedTimeline} from "Store/main/maps/mapStates/$mapState.js";
// import {MapUIWaitMessage} from "UI/@Shared/Maps/MapUIWrapper.js";
// import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
// import {ShowAddTimelineDialog} from "UI/@Shared/Timelines/AddTimelineDialog.js";
// import {RunCommand_AddTimelineStep, RunCommand_DeleteTimeline, RunCommand_UpdateTimeline} from "Utils/DB/Command";
// import {liveSkin} from "Utils/Styles/SkinManager";
// import {ES, Observer, RunInAction, RunInAction_Set} from "web-vcore";
// import {E} from "web-vcore/nm/js-vextensions.js";
// import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row, Text, Spinner, CheckBox} from "web-vcore/nm/react-vcomponents.js";
// import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
// import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
// import {store} from "Store";
// import {zIndexes} from "Utils/UI/ZIndexes";
// import {RecordDropdown} from "./PlayingSubpanel/RecordDropdown";

// @Observer
// export class Header2 extends BaseComponent<{map: Map}, {}> {
// 	timelineSelect: DropDown|n;
// 	render() {
// 		const {map} = this.props;
// 		const uiState = store.main.timelines;
// 		const uiState_maps = store.main.maps;
// 		const mapState = GetMapState.NN(map.id);

// 		//const timelines = GetTimelines(map.id);
// 		const timeline = GetSelectedTimeline(map.id);
// 		if (timeline == null) return null;
// 		const steps = GetTimelineSteps(timeline.id);
// 		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);

// 		return (
// 			<Row center mlr={5} style={{minHeight: 25}}>
// 				{creatorOrMod && <>
// 					<Text>Add: </Text>
// 					<Button ml={5} text="Statement" enabled={timeline != null} onClick={()=>{
// 						if (MeID() == null) return ShowSignInPopup();
// 						// calculate the insert-position to be just after the middle entry of the visible-step-range
// 						/*const visibleStepRange = this.stepList?.getVisibleRange() ?? [steps.length, steps.length];
// 						const insertIndex = Math.floor(visibleStepRange.Average() + 1);*/
// 						const insertIndex = 0; // temp

// 						const prevStep = steps[insertIndex - 1];
// 						const nextStep = steps[insertIndex];

// 						const newStep = new TimelineStep({
// 							timelineID: timeline.id,
// 							orderKey: OrderKey.between(prevStep?.orderKey, nextStep?.orderKey).toString(),
// 							groupID: "full",
// 							message: "",
// 							nodeReveals: [],
// 						});
// 						RunCommand_AddTimelineStep(newStep);
// 					}}/>
// 				</>}
// 			</Row>
// 		);
// 	}
// }
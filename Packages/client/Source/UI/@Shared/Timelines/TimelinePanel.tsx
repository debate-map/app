import {Column, Row} from "react-vcomponents";
import {store} from "Store";
import {GetSelectedTimeline, GetShowTimelineDetails} from "Store/main/maps/mapStates/$mapState.js";
import {DMap, MeID, PERMISSIONS} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {Header1} from "./TimelinePanel/Header1.js";
import {StepList} from "./TimelinePanel/StepList.js";
import {AudioPanel} from "./TimelinePanel/AudioPanel.js";
import {TimelineDetailsEditor} from "./TimelineDetailsUI.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

export const TimelinePanel_width = 600;

export const TimelinePanel = observer_mgl(({map}: {map: DMap})=>{
	const uiState = store.main.timelines;
	const timeline = GetSelectedTimeline(map.id);
	const creatorOrMod = PERMISSIONS.Timeline.Modify(MeID(), timeline);
	const showTimelineDetails = GetShowTimelineDetails(map.id);

	return (
		<Row style={{height: "100%", alignItems: "flex-start"}}>
			<Column className="clickThrough" style={{width: TimelinePanel_width, height: "100%", background: liveSkin.OverlayPanelBackgroundColor().css()}}>
				<Header1 map={map}/>
				{timeline && showTimelineDetails &&
				<div style={{background: "rgb(200,200,200)", padding: 5, borderRadius: 10, marginTop: 5, marginBottom: 7}}>
					<TimelineDetailsEditor timeline={timeline} editing={creatorOrMod}/>
				</div>}
				{timeline != null &&
				<StepList map={map} timeline={timeline}/>}
			</Column>
			{uiState.audioMode && timeline != null &&
			<Column style={{position: "absolute", zIndex: zIndexes.draggable + 1, left: 600, right: 0, top: 0, bottom: 0, background: "rgba(100,100,100,1)"}}>
				<AudioPanel map={map} timeline={timeline}/>
			</Column>}
		</Row>
	);
});

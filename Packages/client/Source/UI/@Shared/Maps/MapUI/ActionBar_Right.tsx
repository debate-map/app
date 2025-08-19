import {E} from "js-vextensions";
import {Button, Row, Spinner, Text} from "react-vcomponents";
import {HSLA, RunInAction_Set} from "web-vcore";
import {GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {DMap} from "dm_common";
import {SLMode} from "UI/@SL/SL.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {LayoutDropDown} from "./ActionBar_Right/LayoutDropDown.js";
import {ShareDropDown} from "./ActionBar_Right/ShareDropDown.js";
import {MapUI} from "../MapUI.js";
import {actionBarHeight} from "./ActionBar_Left.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

type Props = {
	map: DMap,
	subNavBarWidth: number,
};

export const ActionBar_Right = observer_mgl((props: Props)=>{
	const {map, subNavBarWidth} = props;
	const mapState = GetMapState.NN(map.id);
	const mapView = GetMapView.NN(map.id);

	const changeZoom = (newZoom: number)=>{
		const oldZoom = mapState.zoomLevel;
		const mapUI = MapUI.CurrentMapUI;
		const mapCenter_unzoomed = mapUI?.GetMapCenter_AsUnzoomed(oldZoom);
		if (mapUI == null || mapCenter_unzoomed == null) return;

		RunInAction_Set(()=>{
			mapState.zoomLevel = newZoom;
			mapUI.AdjustMapScrollToPreserveCenterPoint(mapCenter_unzoomed, newZoom);

			// There is a bug in Chrome where if you change the transform-scaling of an element, it doesn't update the "valid scrollbar range" for the scroll-container until something triggers a recalc.
			// This causes the map's scrolling to be "forced to the left" at some point, which we don't want. (we want the map-center to stay centered)
			// To fix this, we force a recalc of the "valid scrollbar range", by using the procedure below (see: https://stackoverflow.com/a/41426352), followed by a re-attempt of the center-point restoration.
			// UPDATE: This procedure *also* causes the node-uis to be "rerasterized" after a zoom-change, which is needed to fix the issue of node-uis being blurry after zooming-in.
			//         (thus I've removed the workaround in MapUI.tsx, which wasn't great since it reduced scroll performance when many nodes were open)
			mapUI.ScheduleAfterNextRender(()=>{
				const mapEl = mapUI.mapUIEl;
				if (mapEl == null) return;
				const oldDisplay = mapEl.style.display;
				mapEl.style.display = "none"; // hides the element
				mapEl.offsetHeight; // let's the browser "catch up" on the code so it gets redrawn
				mapEl.style.display = oldDisplay; // shows the element again
				mapUI.AdjustMapScrollToPreserveCenterPoint(mapCenter_unzoomed, newZoom);
			});
		});
	};

	const tabBarWidth = 104;
	return (
		<nav style={{
			position: "absolute", zIndex: 1, left: `calc(50% + ${subNavBarWidth / 2}px)`, right: 0, top: 0, textAlign: "center",
		}}>
			<Row style={E(
				{
					justifyContent: "flex-end", background: liveSkin.NavBarPanelBackgroundColor().css(), boxShadow: liveSkin.NavBarBoxShadow(),
					width: "100%", height: actionBarHeight, borderRadius: "0 0 0 10px",
				},
				SLMode && {
					background: HSLA(0, 0, 1, 1),
					boxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
				},
			)}>
					<Row center mr={5}>
						<Text>Zoom:</Text>
						<Spinner ml={3} style={{width: 45}} instant={true} min={.1} max={10} step={.1} value={mapState.zoomLevel} onChange={val=>changeZoom(val)}/>
						<Button ml={3} p="3px 10px" text="-" enabled={mapState.zoomLevel > .1} onClick={()=>changeZoom((mapState.zoomLevel - .1).RoundTo(.1))}/>
						<Button ml={3} p="3px 10px" text="+" enabled={mapState.zoomLevel < 10} onClick={()=>changeZoom((mapState.zoomLevel + .1).RoundTo(.1))}/>
					</Row>
					{!SLMode &&
						<ShareDropDown map={map}/>}
				<LayoutDropDown map={map}/>
			</Row>
		</nav>
	);

});

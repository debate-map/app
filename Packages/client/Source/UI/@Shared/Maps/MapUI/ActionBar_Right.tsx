import {FromJSON, GetEntries, ToNumber, E} from "web-vcore/nm/js-vextensions.js";
import {Button, Pre, Row, Select, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {ShowChangesSinceType} from "Store/main/maps/mapStates/@MapState.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Observer, HSLA, RunInAction, RunInAction_Set} from "web-vcore";
import {GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {Map, ChildOrdering} from "dm_common";
import {GADDemo} from "UI/@GAD/GAD.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {LayoutDropDown} from "./ActionBar_Right/LayoutDropDown.js";
import {ShareDropDown} from "./ActionBar_Right/ShareDropDown.js";
import {MapUI} from "../MapUI.js";

@Observer
export class ActionBar_Right extends BaseComponentPlus({} as {map: Map, subNavBarWidth: number}, {}) {
	render() {
		const {map, subNavBarWidth} = this.props;
		const mapState = GetMapState.NN(map.id);
		const mapView = GetMapView.NN(map.id);

		const ChangeZoom = (newZoom: number)=>{
			const oldZoom = mapState.zoomLevel;
			const mapUI = MapUI.CurrentMapUI;
			const mapCenter_unzoomed = mapUI?.GetMapCenter_AsUnzoomed(oldZoom);
			if (mapUI == null || mapCenter_unzoomed == null) return;

			RunInAction_Set(this, ()=>{
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
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={E(
					{
						justifyContent: "flex-end", background: liveSkin.NavBarPanelBackgroundColor().css(), boxShadow: liveSkin.NavBarBoxShadow(),
						width: "100%", height: GADDemo ? 40 : 30, borderRadius: "0 0 0 10px",
					},
					GADDemo && {
						background: HSLA(0, 0, 1, 1),
						boxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
						// boxShadow: null,
						// filter: 'drop-shadow(rgba(0,0,0,.5) 0px 0px 10px)',
					},
				)}>
						<Row center mr={5}>
							<Text>Zoom:</Text>
							<Spinner ml={3} style={{width: 45}} instant={true} min={.1} max={10} step={.1} value={mapState.zoomLevel} onChange={val=>ChangeZoom(val)}/>
							<Button ml={3} p="3px 10px" text="-" enabled={mapState.zoomLevel > .1} onClick={()=>ChangeZoom((mapState.zoomLevel - .1).RoundTo(.1))}/>
							<Button ml={3} p="3px 10px" text="+" enabled={mapState.zoomLevel < 10} onClick={()=>ChangeZoom((mapState.zoomLevel + .1).RoundTo(.1))}/>
						</Row>
						{!GADDemo &&
							<ShareDropDown map={map}/>}
					<LayoutDropDown map={map}/>
				</Row>
			</nav>
		);
	}
}
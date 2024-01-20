import {Button, Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentWithConnector, BaseComponentPlus, BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {GetSelectedTimeline, GetMapState, GetShowTimelineDetails} from "Store/main/maps/mapStates/$mapState.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Observer, RunInAction} from "web-vcore";
import {IsUserCreatorOrMod, Map, MeID} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {Header1} from "./TimelinePanel/Header1.js";
import {StepList} from "./TimelinePanel/StepList.js";
import {AudioPanel} from "./TimelinePanel/AudioPanel.js";
import {TimelineDetailsEditor} from "./TimelineDetailsUI.js";

export const TimelinePanel_width = 600;

@Observer
export class TimelinePanel extends BaseComponent<{map: Map}, {}> {
	render() {
		const {map} = this.props;
		const uiState = store.main.timelines;
		const timeline = GetSelectedTimeline(map.id);
		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);
		const showTimelineDetails = GetShowTimelineDetails(map.id);

		return (
			<Row style={{height: "100%", alignItems: "flex-start"}}>
				<Column className="clickThrough" style={{width: TimelinePanel_width, height: "100%", background: liveSkin.OverlayPanelBackgroundColor().css() /* borderRadius: "10px 10px 0 0" */}}>
					<Header1 map={map}/>
					{/*<Header2 map={map}/>*/}
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
	}
}
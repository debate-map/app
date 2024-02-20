import {store} from "Store";
import {GetMapState, GetSelectedTimeline} from "Store/main/maps/mapStates/$mapState.js";
import {GetTalkTimeSummaryAtTimeX} from "Store/main/maps/mapStates/PlaybackAccessors/ForSteps";
import {TimelinePanel_width} from "UI/@Shared/Timelines/TimelinePanel";
import {GetTimelineSteps, Map} from "dm_common";
import {Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions";
import {Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

const secondsToMMSS = (seconds: number)=>{
	return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
};

@Observer
export class TimeTrackerUI extends BaseComponent<{map: Map}, {}> {
	render() {
		const {map} = this.props;
		const uiState = store.main.timelines;
		const timeline = GetSelectedTimeline(map.id);
		if (timeline == null) return null;
		const steps = GetTimelineSteps(timeline.id);

		const mapState = GetMapState(map.id);
		const talkTimeSummary = GetTalkTimeSummaryAtTimeX(steps, mapState?.playingTimeline_time ?? 0);

		const leftTime = talkTimeSummary.talkTimeTotals["left"] ?? 0;
		const rightTime = talkTimeSummary.talkTimeTotals["right"] ?? 0;
		return (
			<Row style={{
				position: "absolute", zIndex: 1,
				//left: `calc(${TimelinePanel_width}px + ((100% - ${TimelinePanel_width}px) / 2) - 60px)`,
				left: `calc(50% - 60px)`,
				width: 120, height: 30, background: "rgba(0,0,0,.7)", borderRadius: 5,
				color: "rgba(255,255,255,.7)", fontSize: 20,
				border: "3px solid rgba(0,0,0,.7)",
			}}>
				<Row style={E(
					{flex: 1, alignItems: "center", justifyContent: "center"},
					talkTimeSummary.currentTalker == "left" && {background: "rgba(0,255,0,.3)"},
				)}>
					{secondsToMMSS(leftTime)}
				</Row>
				<Row style={{width: 3, background: "rgba(0,0,0,.7)"}}/>
				<Row style={E(
					{flex: 1, alignItems: "center", justifyContent: "center"},
					talkTimeSummary.currentTalker == "right" && {background: "rgba(0,255,0,.3)"},
				)}>
					{secondsToMMSS(rightTime)}
				</Row>
			</Row>
		);
	}
}
import {BaseComponent, Pre} from "../../../../Frame/UI/ReactGlobals";
import Column from "../../../../Frame/ReactComponents/Column";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetOpenMapID} from "../../../../Store/main";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import Row from "Frame/ReactComponents/Row";
import Button from "Frame/ReactComponents/Button";
import ScrollView from "react-vscrollview";
import {ACTMap_PlayingTimelineSet, ACTMap_PlayingTimelineStepSet, GetPlayingTimeline, GetPlayingTimelineStep} from "Store/main/maps/$map";
import { Map } from "Store/firebase/maps/@Map";

type Props = {map: Map} & Partial<{playingTimeline: Timeline, playingTimeline_step: number}>;
@Connect((state, {map}: Props)=> ({
	playingTimeline: GetPlayingTimeline(map._id),
	playingTimeline_step: GetPlayingTimelineStep(map._id),
}))
export class TimelinePlayerUI extends BaseComponent<Props, {}> {
	render() {
		let {map, playingTimeline, playingTimeline_step} = this.props;
		if (!playingTimeline) return <div/>;

		return (
			<Column style={{position: "absolute", zIndex: 2, left: 10, top: 40, width: 300, padding: 10, background: "rgba(0,0,0,.7)", borderRadius: 5}}>
				<Pre style={{fontSize: 18, textAlign: "center"}}>Timeline</Pre>
				<Row mt={5}>
					<Button text="<" enabled={playingTimeline_step > 0} onClick={()=> {
						store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: playingTimeline_step - 1}))
					}}/>
					{/*<Button ml={5} text="="/>*/}
					<Button ml={5} text=">" enabled={playingTimeline.steps && playingTimeline_step < playingTimeline.steps.length - 1} onClick={()=> {
						store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: playingTimeline_step + 1}))
					}}/>

					<Button ml="auto" text="Close" onClick={()=> {
						store.dispatch(new ACTMap_PlayingTimelineSet({mapID: map._id, timelineID: null}));
						store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: null}));
					}}/>
				</Row>
				{/*<ScrollView style={{maxHeight: 300}}>
				</ScrollView>*/}
			</Column>
		);
	}
}

type TimelineOverlayUIProps = {map: Map} & Partial<{playingTimeline: Timeline, playingTimeline_step: number}>;
@Connect((state, {map}: Props)=> ({
	playingTimeline: GetPlayingTimeline(map._id),
	playingTimeline_step: GetPlayingTimelineStep(map._id),
}))
export class TimelineOverlayUI extends BaseComponent<TimelineOverlayUIProps, {}> {
	render() {
		let {map, playingTimeline, playingTimeline_step} = this.props;
		if (!playingTimeline) return <div/>;

		return (
			<Column style={{position: "absolute", zIndex: 1, left: 0, right: 0, top: 30, bottom: 0}}>
				Step: {playingTimeline_step}
			</Column>
		);
	}
}
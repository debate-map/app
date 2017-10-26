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
import VReactMarkdown_Remarkable from "../../../../Frame/ReactComponents/VReactMarkdown_Remarkable";
import {TimelineStep, TimelineStepActionType} from "../../../../Store/firebase/timelineSteps/@TimelineStep";
import {GetPlayingTimelineStepIndex} from "../../../../Store/main/maps/$map";

type Props = {map: Map} & Partial<{playingTimeline: Timeline, currentStep: TimelineStep}>;
@Connect((state, {map}: Props)=> ({
	playingTimeline: GetPlayingTimeline(map._id),
	currentStep: GetPlayingTimelineStep(map._id),
}))
export class TimelinePlayerUI extends BaseComponent<Props, {}> {
	render() {
		let {map, playingTimeline, currentStep} = this.props;
		if (!playingTimeline) return <div/>;
		if (!currentStep) return <div/>;
		
		let currentStepIndex = playingTimeline.steps.indexOf(currentStep._id);
		let showMessageAction = currentStep.actions.FirstOrX(a=>a.type == TimelineStepActionType.ShowMessage);

		return (
			<Column style={{position: "absolute", zIndex: 2, left: 10, top: 40, width: 500, padding: 10, background: "rgba(0,0,0,.7)", borderRadius: 5}}>
				<Row style={{position: "relative"}}>
					<Pre style={{fontSize: 18, textAlign: "center", width: "100%"}}>Timeline</Pre>
					<Button text="X" style={{position: "absolute", right: 0, padding: "3px 6px", marginTop: -2, marginRight: -2, fontSize: 13}} onClick={()=> {
						store.dispatch(new ACTMap_PlayingTimelineSet({mapID: map._id, timelineID: null}));
						store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: null}));
					}}/>
				</Row>
				<Row mt={5} style={{position: "relative"}}>
					<Button text="<" enabled={currentStepIndex > 0} onClick={()=> {
						store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: currentStepIndex - 1}))
					}}/>
					<Pre className="clickThrough" style={{position: "absolute", fontSize: 15, textAlign: "center", width: "100%"}}>
						Step {currentStepIndex + 1}{currentStep.title ? ": " + currentStep.title : ""}
					</Pre>
					{/*<Button ml={5} text="="/>*/}
					{/*<Button ml="auto" text="Connect" enabled={} onClick={()=> {
					}}/>*/}
					<Button ml="auto" text=">" enabled={playingTimeline.steps && currentStepIndex < playingTimeline.steps.length - 1} onClick={()=> {
						store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: currentStepIndex + 1}))
					}}/>
				</Row>
				<Row>
					{showMessageAction != null &&
						<VReactMarkdown_Remarkable style={{marginTop: 5}} source={showMessageAction.showMessage_message}/>}
				</Row>
				{/*<ScrollView style={{maxHeight: 300}}>
				</ScrollView>*/}
			</Column>
		);
	}
}

type TimelineOverlayUIProps = {map: Map} & Partial<{playingTimeline: Timeline, currentStepIndex: number}>;
@Connect((state, {map}: Props)=> ({
	playingTimeline: GetPlayingTimeline(map._id),
	currentStepIndex: GetPlayingTimelineStepIndex(map._id),
}))
export class TimelineOverlayUI extends BaseComponent<TimelineOverlayUIProps, {}> {
	render() {
		let {map, playingTimeline, currentStepIndex} = this.props;
		if (!playingTimeline) return <div/>;

		return (
			<Column style={{position: "absolute", zIndex: 1, left: 0, right: 0, top: 30, bottom: 0}}>
				Step: {currentStepIndex}
			</Column>
		);
	}
}
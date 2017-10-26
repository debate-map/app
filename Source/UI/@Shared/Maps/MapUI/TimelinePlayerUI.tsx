import {BaseComponent, Pre, Span} from "../../../../Frame/UI/ReactGlobals";
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
import {ReplacementFunc} from "../../../../Frame/ReactComponents/VReactMarkdown";
import {Segment} from "../../../../Frame/General/RegexHelpers";
import NodeUI_Inner from "../MapNode/NodeUI_Inner";
import {GetNode} from "Store/firebase/nodes";
import {MapNode} from "../../../../Store/firebase/nodes/@MapNode";

function GetPropsFromPropsStr(propsStr: string) {
	let propStrMatches = propsStr.Matches(/ (.+?)="(.+?)"/g);
	let props = {} as any;
	for (let propStrMatch of propStrMatches) {
		props[propStrMatch[1]] = propStrMatch[2];
	}
	return props;
}

let replacements = {
	"\\[comment(.+?)\\]\n((.|\n)+?)\n\\[\\/comment\\]": (segment: Segment, index: number)=> {
		let props = GetPropsFromPropsStr(segment.textParts[1]);
		let text = segment.textParts[2];

		return (
			<a href={props.link} target="_blank">
			<Column style={{background: "rgb(247,247,247)", color: "rgb(51, 51, 51)", borderRadius: 5, padding: 5}}>
				<Row>
					<span style={{fontWeight: "bold"}}>{props.author}</span>
					<Span ml="auto" style={{color: "rgb(153,153,153)", fontSize: 12}}>{props.date}</Span>
				</Row>
				<VReactMarkdown_Remarkable source={text}/>
			</Column>
			</a>
		);
	},
	"\\[node(.+?)\\/\\]": (segment: Segment, index: number, extraInfo)=> {
		let props = GetPropsFromPropsStr(segment.textParts[1]);
		return (
			<NodeUI_InMessage map={extraInfo.map} nodeID={props.id}/>
		);
	},
};

type NodeUI_InMessageProps = {map: Map, nodeID: number} & Partial<{node: MapNode}>;
@Connect((state, {nodeID}: NodeUI_InMessageProps)=> ({
	node: GetNode(nodeID),
}))
class NodeUI_InMessage extends BaseComponent<NodeUI_InMessageProps, {}> {
	render() {
		let {map, node} = this.props;
		let path = ""+node._id;
		let nodeEnhanced = node.Extended({finalType: node.type, link: null});
		return (
			<NodeUI_Inner ref="innerBox" map={map} node={nodeEnhanced} nodeView={{}} path={path} width={null} widthOverride={null} panelPosition="below"
				style={{marginTop: 15, filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}/>
		);
	}
}

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
						<VReactMarkdown_Remarkable style={{marginTop: 5}} source={showMessageAction.showMessage_message} replacements={replacements} extraInfo={{map}}/>}
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
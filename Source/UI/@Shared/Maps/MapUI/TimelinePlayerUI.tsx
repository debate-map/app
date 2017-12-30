import {BaseComponent, FindReact} from "react-vextensions";
import {Pre, Span} from "react-vcomponents";
import {Column} from "react-vcomponents";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetOpenMapID} from "../../../../Store/main";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import {Row} from "react-vcomponents";
import {Button} from "react-vcomponents";
import ScrollView from "react-vscrollview";
import {ACTMap_PlayingTimelineSet, ACTMap_PlayingTimelineStepSet, GetPlayingTimeline, GetPlayingTimelineStep} from "Store/main/maps/$map";
import { Map } from "Store/firebase/maps/@Map";
import VReactMarkdown_Remarkable from "../../../../Frame/ReactComponents/VReactMarkdown_Remarkable";
import {TimelineStep} from "../../../../Store/firebase/timelineSteps/@TimelineStep";
import {GetPlayingTimelineStepIndex, ACTMap_PlayingTimelineAppliedStepSet, GetPlayingTimelineAppliedStepIndex} from "../../../../Store/main/maps/$map";
import {ReplacementFunc} from "../../../../Frame/ReactComponents/VReactMarkdown";
import {Segment} from "../../../../Frame/General/RegexHelpers";
import NodeUI_Inner from "../MapNode/NodeUI_Inner";
import {GetNode} from "Store/firebase/nodes";
import {MapNode} from "../../../../Store/firebase/nodes/@MapNode";
import {GetDataAsync, GetAsync} from "Frame/Database/DatabaseHelpers";
import NodeUI from "../MapNode/NodeUI";

function GetPropsFromPropsStr(propsStr: string) {
	let propStrMatches = propsStr.Matches(/ (.+?)="(.+?)"/g);
	let props = {} as any;
	for (let propStrMatch of propStrMatches) {
		props[propStrMatch[1]] = propStrMatch[2];
	}
	return props;
}

let replacements = {
	"\\[comment(.*?)\\]((.|\n)*?)\\[\\/comment\\]": (segment: Segment, index: number)=> {
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
	"\\[node(.*?)\\/\\]": (segment: Segment, index: number, extraInfo)=> {
		let props = GetPropsFromPropsStr(segment.textParts[1]);
		return (
			<NodeUI_InMessage map={extraInfo.map} nodeID={props.id} index={index}/>
		);
	},
	"\\[connectNodesButton(.*?)\\/\\]": (segment: Segment, index: number, extraInfo)=> {
		let props = GetPropsFromPropsStr(segment.textParts[1]);
		//let ids = (props.ids || "").replace(/ /g, "").split(",").map(ToInt);
		let currentStep = extraInfo.currentStep as TimelineStep;
		//let ids = currentStep.actions.filter(a=>a.type == TimelineStepActionType.ShowNode).map(a=>a.showNode_nodeID);
		//let ids = (currentStep.nodeReveals || []).map(a=>a.nodeID);
		return (
			<Button text={props.text || "Place into debate map"} enabled={!extraInfo.stepApplied}
				style={{alignSelf: "center", fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,.7)"}}
				onClick={e=> {
					//let currentStep = await GetAsync(()=>GetPlayingTimelineStepIndex(extraInfo.map._id));
					store.dispatch(new ACTMap_PlayingTimelineAppliedStepSet({mapID: extraInfo.map._id, step: extraInfo.currentStepIndex}));
				}}/>
		);
	},
	"\\[text(.*?)\\]((.|\n)*?)\\[\\/text\\]": (segment: Segment, index: number, extraInfo)=> {
		let props = GetPropsFromPropsStr(segment.textParts[1]);
		return (
			<span style={E(props.textSize && {fontSize: props.textSize})}>
				<VReactMarkdown_Remarkable source={segment.textParts[2]}/>
			</span>
		);
	},
};

type NodeUI_InMessageProps = {map: Map, nodeID: number, index: number} & Partial<{node: MapNode}>;
@Connect((state, {nodeID}: NodeUI_InMessageProps)=> ({
	node: GetNode(nodeID),
}))
class NodeUI_InMessage extends BaseComponent<NodeUI_InMessageProps, {}> {
	render() {
		let {map, node, index} = this.props;
		if (!node) return <div/>;
		
		let path = ""+node._id;
		let nodeEnhanced = node.Extended({finalType: node.type, link: null});
		return (
			<NodeUI_Inner ref="innerBox" map={map} node={nodeEnhanced} nodeView={{}} path={path} width={null} widthOverride={null}
				panelPosition="below" useLocalPanelState={true}
				style={{
					//zIndex: 1, filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"
					//zIndex: 100 - index,
				}}/>
		);
	}
}

type Props = {map: Map} & Partial<{playingTimeline: Timeline, currentStep: TimelineStep, appliedStepIndex: number}>;
@Connect((state, {map}: Props)=> ({
	playingTimeline: GetPlayingTimeline(map._id),
	currentStep: GetPlayingTimelineStep(map._id),
	appliedStepIndex: GetPlayingTimelineAppliedStepIndex(map._id),
}))
export class TimelinePlayerUI extends BaseComponent<Props, {}> {
	root: Column;
	render() {
		let {map, playingTimeline, currentStep, appliedStepIndex} = this.props;
		if (!playingTimeline) return <div/>;
		if (!currentStep) return <div/>;
		
		let currentStepIndex = playingTimeline.steps.indexOf(currentStep._id);

		let stepApplied = appliedStepIndex >= currentStepIndex || (currentStep.nodeReveals || []).length == 0;
		
		return (
			<Column ref={c=>this.root = c}
					style={{position: "absolute", zIndex: 2, left: 10, top: 40, width: 500, padding: 10, background: "rgba(0,0,0,.7)", borderRadius: 5}}
					onClick={e=> {
						if ((e.target as HTMLElement).GetSelfAndParents().Any(a=>a.classList && a.classList.contains("NodeUI_Inner"))) return;
						for (let nodeUI of this.root.DOM.$(".NodeUI_Inner").map(a=>FindReact(a) as NodeUI_Inner)) {
							nodeUI.SetState({local_openPanel: null});
						}
					}}>
				<Row style={{position: "relative"}}>
					<Pre style={{fontSize: 18, textAlign: "center", width: "100%"}}>Timeline</Pre>
					<Button text="X" style={{position: "absolute", right: 0, padding: "3px 6px", marginTop: -2, marginRight: -2, fontSize: 13}} onClick={()=> {
						store.dispatch(new ACTMap_PlayingTimelineSet({mapID: map._id, timelineID: null}));
						store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: null}));
						store.dispatch(new ACTMap_PlayingTimelineAppliedStepSet({mapID: map._id, step: null}));
					}}/>
				</Row>
				<Row mt={5} style={{position: "relative"}}>
					<Button text="<" enabled={currentStepIndex > 0} onClick={()=> {
						store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: currentStepIndex - 1}))
					}}/>
					{stepApplied && currentStepIndex == 0 && appliedStepIndex >= 0 &&
						<Button ml={5} text="Restart" onClick={()=> {
							store.dispatch(new ACTMap_PlayingTimelineAppliedStepSet({mapID: map._id, step: null}));
						}}/>}
					<Pre className="clickThrough" style={{position: "absolute", fontSize: 15, textAlign: "center", width: "100%"}}>
						Step {currentStepIndex + 1}{currentStep.title ? ": " + currentStep.title : ""}
					</Pre>
					{/*<Button ml={5} text="="/>*/}
					{/*<Button ml="auto" text="Connect" enabled={} onClick={()=> {
					}}/>*/}
					{stepApplied &&
						<Button ml="auto" text=">" enabled={playingTimeline.steps && currentStepIndex < playingTimeline.steps.length - 1} onClick={()=> {
							store.dispatch(new ACTMap_PlayingTimelineStepSet({mapID: map._id, step: currentStepIndex + 1}))
						}}/>}
					{!stepApplied &&
						<Button ml="auto" text="Place" onClick={()=> {
							store.dispatch(new ACTMap_PlayingTimelineAppliedStepSet({mapID: map._id, step: currentStepIndex}));
						}}/>}
				</Row>
				<Row sel>
					<VReactMarkdown_Remarkable addMarginsForDanglingNewLines={true}
						className="onlyTopMargin" style={{marginTop: 5, display: "flex", flexDirection: "column", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}
						source={currentStep.message || ""} replacements={replacements} extraInfo={{map, currentStepIndex, currentStep, stepApplied}}/>
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
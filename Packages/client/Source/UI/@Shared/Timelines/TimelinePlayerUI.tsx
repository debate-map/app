import {Button, Column, Pre, Row, Span} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, FindReact, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GetEntries, E} from "web-vcore/nm/js-vextensions.js";
import {VReactMarkdown_Remarkable, Segment, Observer} from "web-vcore";
import {store} from "Store";
import {GetPlayingTimelineAppliedStepIndex, GetPlayingTimelineStep, GetPlayingTimeline, GetPlayingTimelineStepIndex, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {Polarity, TimelineStep, GetNodeL2, AsNodeL3, Map, GetTimelineSteps} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {NodeBox} from "../Maps/Node/NodeBox.js";

function GetPropsFromPropsStr(propsStr: string) {
	const propStrMatches = propsStr.Matches(/ (.+?)="(.+?)"/g);
	const props = {} as any;
	for (const propStrMatch of propStrMatches) {
		props[propStrMatch[1]] = propStrMatch[2];
	}
	return props;
}

const replacements = {
	"\\[comment(.*?)\\]((.|\n)*?)\\[\\/comment\\]": (segment: Segment, index: number)=>{
		const props = GetPropsFromPropsStr(segment.patternMatches[1]);
		const text = segment.patternMatches[2];

		return (
			<a href={props.link} target="_blank" rel="noreferrer">
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
	"\\[node(.*?)\\/\\]": (segment: Segment, index: number, extraInfo)=>{
		const props = GetPropsFromPropsStr(segment.patternMatches[1]);
		const polarityEntry = props.polarity ? GetEntries(Polarity).find(a=>a.name.toLowerCase() == props.polarity) : null;
		const polarity = polarityEntry ? polarityEntry.value : Polarity.supporting;
		return (
			<NodeUI_InMessage map={extraInfo.map} nodeID={props.id} polarity={polarity} index={index}/>
		);
	},
	"\\[connectNodesButton(.*?)\\/\\]": (segment: Segment, index: number, extraInfo)=>{
		const props = GetPropsFromPropsStr(segment.patternMatches[1]);
		// let ids = (props.ids || "").replace(/ /g, "").split(",").map(ToInt);
		const currentStep = extraInfo.currentStep as TimelineStep;
		// let ids = currentStep.actions.filter(a=>a.type == TimelineStepActionType.ShowNode).map(a=>a.showNode_nodeID);
		// let ids = (currentStep.nodeReveals || []).map(a=>a.nodeID);
		const mapState = GetMapState.NN(extraInfo.map.id);
		return (
			<Button text={props.text || "Place into debate map"} enabled={!extraInfo.stepApplied}
				style={{alignSelf: "center", fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,.7)"}}
				onClick={e=>{
					// let currentStep = await GetAsync(()=>GetPlayingTimelineStepIndex(extraInfo.map._id));
					mapState.playingTimeline_appliedStep = extraInfo.currentStepIndex;
				}}/>
		);
	},
	"\\[text(.*?)\\]((.|\n)*?)\\[\\/text\\]": (segment: Segment, index: number, extraInfo)=>{
		const props = GetPropsFromPropsStr(segment.patternMatches[1]);
		return (
			<span style={E(props.textSize && {fontSize: props.textSize})}>
				<VReactMarkdown_Remarkable source={segment.patternMatches[2]}/>
			</span>
		);
	},
};

type NodeUI_InMessageProps = {map: Map, nodeID: string, polarity: Polarity, index: number};
@Observer
class NodeUI_InMessage extends BaseComponentPlus({} as NodeUI_InMessageProps, {}) {
	render() {
		const {map, nodeID, polarity, index} = this.props;
		const nodeL2 = GetNodeL2(nodeID);
		const node = nodeL2 ? AsNodeL3(nodeL2, null, polarity) : null;
		if (!node) return <div/>;

		const path = `${nodeID}`;
		return (
			<NodeBox indexInNodeList={0} treePath="0" map={map} node={node} path={path} forLayoutHelper={false} width={null} //widthOverride={null}
				panelsPosition="below" useLocalPanelState={true}
				style={{
					// zIndex: 1, filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"
					// zIndex: 100 - index,
				}}/>
		);
	}
}

@Observer
export class TimelinePlayerUI extends BaseComponentPlus({} as {map: Map}, {}) {
	root: Column|n;
	render() {
		const {map} = this.props;
		const playingTimeline = GetPlayingTimeline(map.id);
		if (playingTimeline == null) return null;
		const steps = GetTimelineSteps(playingTimeline.id);
		const currentStep = GetPlayingTimelineStep(map.id);
		const currentStepIndex = GetPlayingTimelineStepIndex(map.id);
		const appliedStepIndex = GetPlayingTimelineAppliedStepIndex(map.id);

		if (!playingTimeline) return <div/>;
		if (!currentStep) return <div/>;
		if (appliedStepIndex == null || currentStepIndex == null) return null;

		const stepApplied = appliedStepIndex >= currentStepIndex || (currentStep.nodeReveals || []).length == 0;

		const mapState = GetMapState.NN(map.id);
		return (
			<Column ref={c=>this.root = c}
				style={{
					position: "absolute", zIndex: 2,
					//left: 10,
					left: 610,
					top: 40, width: 500, padding: 10,
					background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 5,
				}}
				onClick={e=>{
					if ((e.target as HTMLElement).GetSelfAndParents().Any(a=>a.classList && a.classList.contains("NodeBox"))) return;
					for (const nodeUI of this.root!.DOM!.$(".NodeBox").map(a=>FindReact(a) as NodeBox)) {
						nodeUI.SetState({hoverPanel: null});
					}
				}}>
				<Row style={{position: "relative"}}>
					<Pre style={{fontSize: 18, textAlign: "center", width: "100%"}}>Timeline</Pre>
					<Button text="X" style={{position: "absolute", right: 0, padding: "3px 6px", marginTop: -2, marginRight: -2, fontSize: 13}} onClick={()=>{
						// mapInfo.playingTimeline = null;
						mapState.playingTimeline_step = null;
						mapState.playingTimeline_appliedStep = null;
					}}/>
				</Row>
				<Row mt={5} style={{position: "relative"}}>
					<Button text="<" enabled={currentStepIndex > 0} onClick={()=>{
						mapState.playingTimeline_step = currentStepIndex - 1;
					}}/>
					{stepApplied && currentStepIndex == 0 && appliedStepIndex >= 0
						&& <Button ml={5} text="Restart" onClick={()=>{
							mapState.playingTimeline_appliedStep = null;
						}}/>}
					<Pre className="clickThrough" style={{position: "absolute", fontSize: 15, textAlign: "center", width: "100%"}}>
						Step {currentStepIndex + 1}{/*currentStep.title ? `: ${currentStep.title}` :*/ ""}
					</Pre>
					{/* <Button ml={5} text="="/> */}
					{/* <Button ml="auto" text="Connect" enabled={} onClick={()=> {
					}}/> */}
					{stepApplied
						&& <Button ml="auto" text=">" enabled={steps && currentStepIndex < steps.length - 1} onClick={()=>{
							mapState.playingTimeline_step = currentStepIndex + 1;
						}}/>}
					{!stepApplied
						&& <Button ml="auto" text="Place" onClick={()=>{
							mapState.playingTimeline_appliedStep = currentStepIndex;
						}}/>}
				</Row>
				<Row sel>
					<VReactMarkdown_Remarkable addMarginsForDanglingNewLines={true}
						className="onlyTopMargin" style={{marginTop: 5, display: "flex", flexDirection: "column", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}
						source={currentStep.message || ""} replacements={replacements} extraInfo={{map, currentStepIndex, currentStep, stepApplied}}/>
				</Row>
				{/* <ScrollView style={{maxHeight: 300}}>
				</ScrollView> */}
			</Column>
		);
	}
}

/*@Observer
export class TimelineOverlayUI extends BaseComponentPlus({} as {map: Map}, {}) {
	render() {
		const {map} = this.props;
		const playingTimeline = GetPlayingTimeline(map.id);
		const currentStepIndex = GetPlayingTimelineStepIndex(map.id);
		if (!playingTimeline) return <div/>;
		return (
			<Column style={{position: "absolute", zIndex: 1, left: 0, right: 0, top: 30, bottom: 0}}>
				Step: {currentStepIndex}
			</Column>
		);
	}
}*/
import {GetNodeColor} from "Store/db_ext/nodes";
import {UUIDPathStub} from "UI/@Shared/UUIDStub";
import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import chroma from "chroma-js";
import {GetNodeDisplayText, GetNodeID, GetNodeL2, GetNodeL3, GetNodeLinks, GetPathNodes, GetTimelineStepTimeFromStart, Map, NodeType, SearchUpFromNodeForNodeMatchingX, TimelineStep} from "dm_common";
import {NodeEffect, TimelineStepEffect} from "dm_common/Source/DB/timelineSteps/@TimelineStepEffect";
import map from "updeep/types/map";
import {InfoButton, Observer} from "web-vcore";
import {GetAsync} from "web-vcore/.yalc/mobx-graphlink";
import {ShowMessageBox} from "web-vcore/.yalc/react-vmessagebox";
import {Assert, Clone, E} from "web-vcore/nm/js-vextensions.js";
import {Button, CheckBox, Column, Pre, Row, Select, Spinner, Text, TimeSpanInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GetMapState} from "Store/main/maps/mapStates/$mapState";
import {GetPlaybackTime} from "Store/main/maps/mapStates/PlaybackAccessors/Basic";
import {StepEffectUI_Menu_Stub} from "./StepEffectUI_Menu";

const GetNodeInfoForStepEffectUI = (nodeEffect: NodeEffect)=>{
	const nodePath = nodeEffect.path;
	const nodeID = GetNodeID(nodePath);
	let node = GetNodeL2(nodeID);
	let nodeL3 = GetNodeL3(nodePath);
	// if one is null, make them both null to be consistent
	if (node == null || nodeL3 == null) {
		node = null;
		nodeL3 = null;
	}

	const pathNodes = nodePath ? GetPathNodes(nodePath) : null;
	// path is valid if every node in path, has the previous node as a parent
	const pathValid = pathNodes != null && pathNodes.every((idInPath, i)=>{
		const parentID = pathNodes[i - 1];
		const parentLink = GetNodeLinks(parentID, idInPath)[0];
		return i == 0 || (idInPath && parentID && parentLink != null);
	});
	return {path: nodePath, id: nodeID, node, nodeL3, pathNodes, pathValid};
};

@Observer
export class StepEffectUI extends BaseComponentPlus({} as {map: Map, step: TimelineStep, effect: TimelineStepEffect, editing: boolean, index: number}, {detailsOpen: false}) {
	render() {
		const {map, step, effect, editing, index} = this.props;
		const {detailsOpen} = this.state;

		const nodeInfo = effect.nodeEffect ? GetNodeInfoForStepEffectUI(effect.nodeEffect) : null;

		let displayText: string = "[unknown effect type]";
		if (effect.nodeEffect) displayText = nodeInfo && nodeInfo.node && nodeInfo.nodeL3 ? GetNodeDisplayText(nodeInfo.node, nodeInfo.path) : `(Node no longer exists: ${GetNodeID(nodeInfo?.path)})`;
		else if (effect.setTimeTrackerState != null) displayText = `Set time-tracker state: ${effect.setTimeTrackerState ? "visible" : "hidden"}`;

		let backgroundColor: chroma.Color;
		if (effect.nodeEffect) backgroundColor = GetNodeColor(nodeInfo?.nodeL3 || {type: NodeType.category} as any).desaturate(0.5).alpha(0.8);
		else backgroundColor = chroma("rgba(217,212,122,.8)");

		return (
			<>
				<Row key={index} sel mt={5}
					style={E(
						{width: "100%", padding: 3, background: backgroundColor.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)"},
					)}
					onClick={()=>this.SetState({detailsOpen: !detailsOpen})}
					onContextMenu={e=>e.preventDefault()}
				>
					{/*<Pre>{effect.time_relative.toFixed(1)}</Pre>*/}
					<span style={{position: "relative", paddingTop: 2, fontSize: 12, color: "rgba(20,20,20,1)"}}>
						<span style={{
							position: "absolute", left: -5, top: -8, lineHeight: "11px", fontSize: 10, color: "yellow",
							background: "rgba(50,50,50,1)", borderRadius: 5, padding: "0 3px",
						}}>
							{[
								effect.time_relative.toFixed(1),
								effect.nodeEffect?.show && "show",
								effect.nodeEffect?.changeFocusLevelTo != null && `focus:${effect.nodeEffect.changeFocusLevelTo}`,
								effect.nodeEffect?.setExpandedTo == true && `expand`,
								effect.nodeEffect?.setExpandedTo == false && `collapse`,
								effect.nodeEffect?.hide && "hide",
							].filter(a=>a).join(", ")}
							{effect.nodeEffect != null && !nodeInfo?.pathValid && <span style={{marginLeft: 5, color: "red"}}>[path invalid]</span>}
						</span>
						{displayText}
					</span>
					<Button ml="auto" mdIcon="delete" style={{margin: -3, padding: "3px 10px"}} onClick={e=>{
						const newEffects = (step.extras?.effects ?? []).Exclude(effect);
						RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
						e.stopPropagation(); // prevent this click from causing details-section to open
					}}/>
					{editing && <StepEffectUI_Menu_Stub step={step} effect={effect} effectIndex={index}/>}
				</Row>
				{detailsOpen &&
				<Column sel mt={5}>
					<EffectUIDetails_General map={map} step={step} stepEffect={effect} stepEffectIndex={index} editing={editing}/>
					{effect.nodeEffect && <EffectUIDetails_NodeEffect map={map} step={step} stepEffect={effect} stepEffectIndex={index} effect={effect.nodeEffect} editing={editing}/>}
				</Column>}
			</>
		);
	}
}

@Observer
class EffectUIDetails_General extends BaseComponent<{map: Map, step: TimelineStep, stepEffect: TimelineStepEffect, stepEffectIndex: number, editing: boolean}, {}> {
	render() {
		const {map, step, stepEffect, stepEffectIndex, editing} = this.props;
		const playbackCurrentTime = GetPlaybackTime();
		const stepStartTime = GetTimelineStepTimeFromStart(step);
		return (
			<>
				{/* controls to change the time_relative field of the effect */}
				<Row center>
					<Pre>Time (relative):</Pre>
					<Spinner ml={5} min={0} value={stepEffect.time_relative} onChange={val=>UpdateStepEffect(step, stepEffectIndex, stepEffect, a=>a.time_relative = val)}/>
					{playbackCurrentTime != null && stepStartTime != null &&
					<Pre>{` (that of current playback time: ${(playbackCurrentTime - stepStartTime).FloorTo_Str(.01)})`}</Pre>}
				</Row>
			</>
		);
	}
}

@Observer
class EffectUIDetails_NodeEffect extends BaseComponent<{map: Map, step: TimelineStep, stepEffect: TimelineStepEffect, stepEffectIndex: number, effect: NodeEffect, editing: boolean}, {}> {
	render() {
		const {map, step, stepEffect, stepEffectIndex, effect, editing} = this.props;

		const nodeInfo = GetNodeInfoForStepEffectUI(effect);

		return (
			<>
				<Row>
					<Text>Path: </Text>
					<UUIDPathStub path={nodeInfo.path}/>
					{!nodeInfo.pathValid && editing &&
					<Button ml="auto" text="Fix path" enabled={nodeInfo.node != null} onClick={async()=>{
						const newPath = await GetAsync(()=>SearchUpFromNodeForNodeMatchingX(nodeInfo.node!.id, id=>id == map.rootNode));
						if (newPath == null) {
							return void ShowMessageBox({title: "Could not find new path", message: "Failed to find new path between map root-node and this step's node."});
						}
						UpdateNodeEffect(step, stepEffectIndex, stepEffect, a=>a.path = newPath);
					}}/>}
				</Row>
				{editing &&
				<Row>
					<CheckBox ml={5} text="Show" value={effect.show ?? false} onChange={val=>UpdateNodeEffect(step, stepEffectIndex, stepEffect, a=>{
						a.show = val;
						if (val) a.hide = false;
					})}/>
					{effect.show &&
					<>
						<Text ml={10}>Reveal depth:</Text>
						<Spinner ml={5} min={0} max={50} value={effect.show_revealDepth ?? 0} onChange={val=>UpdateNodeEffect(step, stepEffectIndex, stepEffect, a=>a.show_revealDepth = val)}/>
					</>}
				</Row>}
				{editing &&
				<Row>
					<CheckBox ml={5} text="Change focus level to:" value={effect.changeFocusLevelTo != null} onChange={val=>UpdateNodeEffect(step, stepEffectIndex, stepEffect, a=>{
						// when manually checking this box, setting to 0 is more common (since setting to 1 is auto-set for newly-dragged reveal-nodes)
						if (val) a.changeFocusLevelTo = 0;
						else delete a.changeFocusLevelTo;
					})}/>
					<InfoButton text="While a node has a focus-level of 1+, the timeline will keep it in view while progressing through its steps (ie. during automatic scrolling and zooming)."/>
					{effect.changeFocusLevelTo != null &&
					<>
						<Spinner ml={5} value={effect.changeFocusLevelTo} onChange={val=>UpdateNodeEffect(step, stepEffectIndex, stepEffect, a=>a.changeFocusLevelTo = val)}/>
					</>}
				</Row>}
				{editing &&
				<Row>
					<CheckBox ml={5} text="Set expanded to:" value={effect.setExpandedTo != null} onChange={val=>UpdateNodeEffect(step, stepEffectIndex, stepEffect, a=>{
						if (val) a.setExpandedTo = true;
						else delete a.setExpandedTo;
					})}/>
					{effect.setExpandedTo != null &&
					<>
						<Select ml={5} options={{expanded: true, collapsed: false}} value={effect.setExpandedTo} onChange={(val: boolean)=>UpdateNodeEffect(step, stepEffectIndex, stepEffect, a=>a.setExpandedTo = val)}/>
					</>}
				</Row>}
				{editing &&
				<Row>
					<CheckBox ml={5} text="Hide" value={effect.hide ?? false} onChange={val=>UpdateNodeEffect(step, stepEffectIndex, stepEffect, a=>{
						a.hide = val;
						if (val) a.show = false;
					})}/>
				</Row>}
			</>
		);
	}
}

export async function UpdateStepEffect(step: TimelineStep, effectIndex: number, baseEffect: TimelineStepEffect, effectModifier: (effect: TimelineStepEffect)=>any) {
	// defensive
	Assert(baseEffect == step.extras?.effects?.[effectIndex], "Passed baseEffect did not match what was found in `stepEffects[effectIndex]`!");

	const newEffects = Clone(step.extras?.effects ?? []) as TimelineStepEffect[];
	//newEffects[effectIndex] = {...newEffects[effectIndex], ...effectUpdates};
	//newEffects[effectIndex] = effectNewValGetter();
	effectModifier(newEffects[effectIndex]);

	await RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
}
export async function UpdateNodeEffect(step: TimelineStep, effectIndex: number, baseEffect: TimelineStepEffect, nodeEffectModifier: (nodeEffect: NodeEffect)=>any) {
	await UpdateStepEffect(step, effectIndex, baseEffect, a=>nodeEffectModifier(a.nodeEffect!));
}
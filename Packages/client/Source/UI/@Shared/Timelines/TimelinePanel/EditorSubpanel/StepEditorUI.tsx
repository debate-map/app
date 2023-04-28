import {ToJSON, Vector2, VRect, WaitXThenRun, GetEntries, Clone, DEL, E, CreateStringEnum} from "web-vcore/nm/js-vextensions.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd.js";
import {Button, CheckBox, Column, Pre, Row, Select, Text, TextArea, TimeSpanInput, Spinner} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM, ShallowChanged} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {DragInfo, MakeDraggable, Observer} from "web-vcore";
import {DraggableInfo, DroppableInfo} from "Utils/UI/DNDStructures.js";
import {UUIDPathStub} from "UI/@Shared/UUIDStub.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import {VMenuStub, VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {Timeline, GetTimelineStep, IsUserCreatorOrMod, MeID, TimelineStep, NodeReveal, GetNodeID, GetNode, GetNodeL2, GetNodeL3, GetNodeDisplayText, NodeType, SearchUpFromNodeForNodeMatchingX, Map, OrderKey, GetPathNodes, GetNodeLinks} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_AddTimelineStep, RunCommand_DeleteTimelineStep, RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {GetNodeColor} from "Store/db_ext/nodes";

export enum PositionOptionsEnum {
	full = "full",
	left = "left",
	right = "right",
	center = "center",
}
/*export const positionOptions = [
	{ name: 'Full', value: null },
	{ name: 'Left', value: 1 },
	{ name: 'Right', value: 2 },
	{ name: 'Center', value: 3 },
];*/
export const positionOptions = GetEntries(PositionOptionsEnum);

/* let portal: HTMLElement;
WaitXThenRun(0, () => {
	portal = document.createElement('div');
	document.body.appendChild(portal);
}); */

export type StepEditorUIProps = {index: number, last: boolean, map: Map, timeline: Timeline, stepID: string, draggable?: boolean} & {dragInfo?: DragInfo};

@MakeDraggable(({index, stepID, draggable}: StepEditorUIProps)=>{
	if (draggable == false) return null as any; // todo: is this "as any" valid?
	// upgrade note: make sure dnd isn't broken from having to comment the next line out
	// if (step == null) return null; // if step is not yet loaded, don't actually apply the draggable-wrapping
	return {
		type: "TimelineStep",
		draggableInfo: new DraggableInfo({stepID}),
		index,
		// enabled: step != null, // if step is not yet loaded, don't actually apply the draggable-wrapping
	};
})
@Observer
// @SimpleShouldUpdate({ propsToIgnore: ['dragInfo'] })
export class StepEditorUI extends BaseComponentPlus({} as StepEditorUIProps, {placeholderRect: null as VRect|n}) {
	/* static ValidateProps(props: StepUIProps) {
		Assert(props.step != null);
	} */

	/* shouldComponentUpdate(newProps, newState) {
		if (ShallowChanged(this.props.ExcludeKeys('dragInfo'), newProps.ExcludeKeys('dragInfo')) || ShallowChanged(this.state, newState)) return true;
		// for dragInfo, do a json-based comparison (I think this is fine?)
		if (ToJSON(this.props.dragInfo) != ToJSON(newProps.dragInfo)) return true;
		return false;
	} */

	render() {
		const {index, last, map, timeline, stepID, dragInfo} = this.props;
		const {placeholderRect} = this.state;
		const step = GetTimelineStep(stepID);
		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);

		if (step == null) {
			return <div style={{height: 100}}><div {...(dragInfo && dragInfo.provided.draggableProps)} {...(dragInfo && dragInfo.provided.dragHandleProps)}/></div>;
		}
		const timeType = step?.timeFromLastStep != null ? "last step" : "start";

		const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
		const result = (
			// wrapper needed to emulate margin-top (since react-list doesn't support margins)
			<div style={{paddingTop: index == 0 ? 0 : 7}}>
				<Column /* mt={index == 0 ? 0 : 7} */ {...(dragInfo && dragInfo.provided.draggableProps)}
					style={E(
						{background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10, border: "1px solid rgba(255,255,255,.15)"},
						dragInfo && dragInfo.provided.draggableProps.style,
						asDragPreview && {zIndex: zIndexes.draggable},
					)}>
					<Row center p="7px 10px" {...(dragInfo && dragInfo.provided.dragHandleProps)}>
						<Pre>Step {index + 1}</Pre>
						{/* <Button ml={5} text="Edit" title="Edit this step" style={{ flexShrink: 0 }} onClick={() => {
							ShowEditTimelineStepDialog(MeID(), step);
						}}/> */}
						<Row center ml="auto">
							<Text>Time from </Text>
							<Select options={["start", "last step"]} value={timeType} onChange={typeStr=>{
								const val = (step.timeFromStart ?? step.timeFromLastStep) ?? 0;
								if (typeStr == "start") {
									RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: val, timeFromLastStep: null}});
								} else {
									RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: null, timeFromLastStep: val}});
								}
							}}/>
							<Text> : </Text>
							{timeType == "start" &&
							<TimeSpanInput largeUnit="minute" smallUnit="second" style={{width: 60}} enabled={creatorOrMod} value={step.timeFromStart ?? 0} onChange={val=>{
								RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: val}});
							}}/>}
							{timeType == "last step" &&
							<>
								<Spinner style={{width: 60}} enabled={creatorOrMod} step={.1} value={step.timeFromLastStep ?? 0} onChange={val=>{
									RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromLastStep: val}});
								}}/>
								<Text title="seconds">s</Text>
							</>}
							{/* <Pre>Speaker: </Pre>
							<Select value={} onChange={val=> {}}/> */}
							<Pre ml={5}>Position: </Pre>
							<Select options={positionOptions} value={step.groupID} enabled={creatorOrMod} onChange={val=>{
								RunCommand_UpdateTimelineStep({id: step.id, updates: {groupID: val}});
							}}/>
							<Button ml={5} text="X" enabled={creatorOrMod} onClick={()=>{
								ShowMessageBox({
									title: `Delete step ${index + 1}`, cancelButton: true,
									message: `
										Delete timeline step with text:

										${step.message}
									`.AsMultiline(0),
									onOK: ()=>{
										RunCommand_DeleteTimelineStep({id: step.id});
									},
								});
							}}/>
						</Row>
						{creatorOrMod &&
						<VMenuStub>
							<VMenuItem text="Clone" style={liveSkin.Style_VMenuItem()}
								onClick={e=>{
									if (e.button != 0) return;
									const newTimelineStep = Clone(step);
									newTimelineStep.orderKey = new OrderKey(step.orderKey).next().toString();
									RunCommand_AddTimelineStep(newTimelineStep);
								}}/>
						</VMenuStub>}
					</Row>
					{/* <Row ml={5} style={{ minHeight: 20 }}>{step.message}</Row> */}
					<TextArea /* {...{ useCacheForDOMMeasurements: true } as any} */ autoSize={true}
						style={{
							//background: "rgba(255,255,255,.2)",
							padding: 5, outline: "none",
						}}
						value={step.message} enabled={creatorOrMod}
						onChange={val=>{
							RunCommand_UpdateTimelineStep({id: step.id, updates: {message: val}});
						}}/>
					<Droppable type="NodeL1" droppableId={ToJSON(new DroppableInfo({type: "TimelineStepNodeRevealList", timelineID: timeline.id, stepID: step.id}))} isDropDisabled={!creatorOrMod}>
						{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>{
							const dragIsOverDropArea = provided.placeholder?.props["on"] != null;
							if (dragIsOverDropArea) {
								WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder());
							}

							return (
								<Column ref={c=>{ this.nodeHolder = c; provided.innerRef(GetDOM(c) as any); }} {...provided.droppableProps}
									style={E(
										{position: "relative", padding: 7, background: "rgba(255,255,255,.3)", borderRadius: "0 0 10px 10px"},
										(step.nodeReveals == null || step.nodeReveals.length == 0) && {padding: "3px 5px"},
									)}>
									{(step.nodeReveals == null || step.nodeReveals.length == 0) && !dragIsOverDropArea &&
									<div style={{fontSize: 11, opacity: 0.7, textAlign: "center"}}>Drag nodes here to have them display when the playback reaches this step.</div>}
									{step.nodeReveals && step.nodeReveals.map((nodeReveal, index)=>{
										return <NodeRevealUI key={index} map={map} step={step} nodeReveal={nodeReveal} editing={creatorOrMod} index={index}/>;
									})}
									{provided.placeholder}
									{dragIsOverDropArea && placeholderRect &&
										<div style={{
											// position: 'absolute', left: 0 /* placeholderRect.x */, top: placeholderRect.y, width: placeholderRect.width, height: placeholderRect.height,
											position: "absolute", left: 7 /* placeholderRect.x */, top: placeholderRect.y, right: 7, height: placeholderRect.height,
											border: "1px dashed rgba(255,255,255,1)", borderRadius: 5,
										}}/>}
								</Column>
							);
						}}
					</Droppable>
				</Column>
			</div>
		);

		// if drag preview, we have to put in portal, since otherwise the "filter" effect of ancestors causes the {position:fixed} style to not be relative-to-page
		/* if (asDragPreview) {
			return ReactDOM.createPortal(result, portal);
		} */
		return result;
	}
	nodeHolder: Row|n;

	StartGeneratingPositionedPlaceholder() {
		if (this.nodeHolder == null || !this.nodeHolder.mounted || this.nodeHolder.DOM == null) {
			// call again in a second, once node-holder is initialized
			WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder());
			return;
		}

		const nodeHolderRect = VRect.FromLTWH(this.nodeHolder.DOM.getBoundingClientRect());
		const dragBox = document.querySelector(".NodeUI_Inner.DragPreview");
		if (dragBox == null) return; // this can happen at end of drag
		const dragBoxRect = VRect.FromLTWH(dragBox.getBoundingClientRect());

		const siblingNodeUIs = (Array.from(this.nodeHolder.DOM.childNodes) as HTMLElement[]).filter(a=>a.classList.contains("NodeUI"));
		const siblingNodeUIInnerDOMs = siblingNodeUIs.map(nodeUI=>nodeUI.QuerySelector_BreadthFirst(".NodeUI_Inner")).filter(a=>a != null); // entry can be null if inner-ui still loading
		const firstOffsetInner = siblingNodeUIInnerDOMs.find(a=>a && a.style.transform && a.style.transform.includes("translate("));

		let placeholderRect: VRect;
		if (firstOffsetInner) {
			const firstOffsetInnerRect = VRect.FromLTWH(firstOffsetInner.getBoundingClientRect()).NewTop(top=>top - dragBoxRect.height);
			const firstOffsetInnerRect_relative = new VRect(firstOffsetInnerRect.Position.Minus(nodeHolderRect.Position), firstOffsetInnerRect.Size);

			placeholderRect = firstOffsetInnerRect_relative.NewWidth(dragBoxRect.width).NewHeight(dragBoxRect.height);
		} else {
			if (siblingNodeUIInnerDOMs.length && siblingNodeUIInnerDOMs.Last() != null) {
				const lastInner = siblingNodeUIInnerDOMs.Last()!;
				const lastInnerRect = VRect.FromLTWH(lastInner.getBoundingClientRect()).NewTop(top=>top - dragBoxRect.height);
				const lastInnerRect_relative = new VRect(lastInnerRect.Position.Minus(nodeHolderRect.Position), lastInnerRect.Size);

				placeholderRect = lastInnerRect_relative.NewWidth(dragBoxRect.width).NewHeight(dragBoxRect.height);
				// if (dragBoxRect.Center.y > firstOffsetInnerRect.Center.y) {
				placeholderRect.y += lastInnerRect.height;
			} else {
				// placeholderRect = new VRect(Vector2.zero, dragBoxRect.Size);
				placeholderRect = new VRect(new Vector2(7, 7), dragBoxRect.Size); // adjust for padding
			}
		}

		this.SetState({placeholderRect});
	}
}

@Observer
export class NodeRevealUI extends BaseComponentPlus({} as {map: Map, step: TimelineStep, nodeReveal: NodeReveal, editing: boolean, index: number}, {detailsOpen: false}) {
	render() {
		const {map, step, nodeReveal, editing, index} = this.props;
		const {detailsOpen} = this.state;

		const {path} = nodeReveal;
		const nodeID = GetNodeID(path);
		let node = GetNodeL2(nodeID);
		let nodeL3 = GetNodeL3(path);
		// if one is null, make them both null to be consistent
		if (node == null || nodeL3 == null) {
			node = null;
			nodeL3 = null;
		}

		const pathNodes = GetPathNodes(path);
		// path is valid if every node in path, has the previous node as a parent
		const pathValid = pathNodes.every((nodeID, index)=>{
			const parentID = pathNodes[index - 1];
			const parentLink = GetNodeLinks(parentID, nodeID)[0];
			return index == 0 || (nodeID && parentID && parentLink != null);
		});

		let displayText = node && nodeL3 ? GetNodeDisplayText(node, nodeReveal.path) : `(Node no longer exists: ${GetNodeID(nodeReveal.path)})`;
		if (!pathValid) {
			displayText = `[path invalid] ${displayText}`;
		}

		const backgroundColor = GetNodeColor(nodeL3 || {type: NodeType.category} as any).desaturate(0.5).alpha(0.8);
		// if (node == null || nodeL3 == null) return null;
		return (
			<>
				<Row key={index} sel mt={index === 0 ? 0 : 5}
					style={E(
						{width: "100%", padding: 5, background: backgroundColor.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)"},
						// selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
					)}
					onMouseDown={e=>{
						if (e.button !== 2) return false;
						// this.SetState({ menuOpened: true });
					}}
					onClick={()=>this.SetState({detailsOpen: !detailsOpen})}
				>
					<span>{!nodeReveal.show && !nodeReveal.hide ? "[disabled] " : ""}{nodeReveal.hide ? "[hide] " : ""}{displayText}</span>
					{/* <NodeUI_Menu_Helper {...{map, node}}/> */}
					{/* <NodeUI_Menu_Stub {...{ node: nodeL3, path: `${node.id}`, inList: true }}/> */}
					{editing &&
					<Button ml="auto" text="X" style={{margin: -3, padding: "3px 10px"}} onClick={()=>{
						const newNodeReveals = step.nodeReveals.Exclude(nodeReveal);
						RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
					}}/>}
				</Row>
				{detailsOpen &&
				<Column sel mt={5}>
					<Row>
						<Text>Path: </Text>
						<UUIDPathStub path={path}/>
						{!pathValid && editing &&
						<Button ml="auto" text="Fix path" enabled={node != null} onClick={async()=>{
							const newPath = await GetAsync(()=>SearchUpFromNodeForNodeMatchingX(node!.id, id=>id == map.rootNode));
							if (newPath == null) {
								return void ShowMessageBox({title: "Could not find new path", message: "Failed to find new path between map root-node and this step's node."});
							}
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							newNodeReveals[index].path = newPath;
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>}
					</Row>
					{editing &&
					<Row>
						<CheckBox ml={5} text="Show" value={nodeReveal.show} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							newNodeReveals[index].show = val;
							if (val) newNodeReveals[index].hide = false;
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
						{nodeReveal.show &&
						<>
							<Text ml={10}>Reveal depth:</Text>
							<Spinner ml={5} min={0} max={50} value={nodeReveal.show_revealDepth} onChange={val=>{
								const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
								newNodeReveals[index].VSet("show_revealDepth", val > 0 ? val : DEL);
								RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
							}}/>
						</>}
					</Row>}
					{editing &&
					<Row>
						<CheckBox ml={5} text="Hide" value={nodeReveal.hide} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							newNodeReveals[index].hide = val;
							if (val) newNodeReveals[index].show = false;
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
					</Row>}
				</Column>}
			</>
		);
	}
}
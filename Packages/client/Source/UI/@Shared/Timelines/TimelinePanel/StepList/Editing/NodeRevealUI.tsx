import {GetNodeColor} from "Store/db_ext/nodes";
import {UUIDPathStub} from "UI/@Shared/UUIDStub.js";
import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {GetNodeDisplayText, GetNodeID, GetNodeL2, GetNodeL3, GetNodeLinks, GetPathNodes, Map, NodeReveal, NodeType, SearchUpFromNodeForNodeMatchingX, TimelineStep} from "dm_common";
import {InfoButton, Observer} from "web-vcore";
import {Clone, E} from "web-vcore/nm/js-vextensions.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import {Button, CheckBox, Column, Row, Select, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

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

		const displayText = node && nodeL3 ? GetNodeDisplayText(node, nodeReveal.path) : `(Node no longer exists: ${GetNodeID(nodeReveal.path)})`;

		const backgroundColor = GetNodeColor(nodeL3 || {type: NodeType.category} as any).desaturate(0.5).alpha(0.8);
		// if (node == null || nodeL3 == null) return null;
		return (
			<>
				<Row key={index} sel mt={5}
					style={E(
						{
							width: "100%", padding: 3, background: backgroundColor.css(), borderRadius: 5, cursor: "pointer",
							//border: "1px solid rgba(0,0,0,.5)"
							border: "5px solid rgba(0,0,0,.5)", // temp, to signify an entry is using the node-reveal system (which is being replaced by the step-effects system)
						},
						// selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
					)}
					onMouseDown={e=>{
						if (e.button !== 2) return false;
						// this.SetState({ menuOpened: true });
					}}
					onClick={()=>this.SetState({detailsOpen: !detailsOpen})}
				>
					<span style={{position: "relative", paddingTop: 2, fontSize: 12, color: "rgba(20,20,20,1)"}}>
						<span style={{
							position: "absolute", left: -5, top: -8, lineHeight: "11px", fontSize: 10, color: "yellow",
							background: "rgba(50,50,50,1)", borderRadius: 5, padding: "0 3px",
						}}>
							{[
								nodeReveal.show && "show",
								nodeReveal.changeFocusLevelTo != null && `focus:${nodeReveal.changeFocusLevelTo}`,
								nodeReveal.setExpandedTo == true && `expand`,
								nodeReveal.setExpandedTo == false && `collapse`,
								nodeReveal.hide && "hide",
							].filter(a=>a).join(", ")}
							{!pathValid && <span style={{marginLeft: 5, color: "red"}}>[path invalid]</span>}
						</span>
						{displayText}
					</span>
					{/* <NodeUI_Menu_Helper {...{map, node}}/> */}
					{/* <NodeUI_Menu_Stub {...{ node: nodeL3, path: `${node.id}`, inList: true }}/> */}
					{editing &&
					<Button ml="auto" mdIcon="delete" style={{margin: -3, padding: "3px 10px"}} onClick={()=>{
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
						<CheckBox ml={5} text="Show" value={nodeReveal.show ?? false} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							newNodeReveals[index].show = val;
							if (val) newNodeReveals[index].hide = false;
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
						{nodeReveal.show &&
						<>
							<Text ml={10}>Reveal depth:</Text>
							<Spinner ml={5} min={0} max={50} value={nodeReveal.show_revealDepth ?? 0} onChange={val=>{
								const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
								//newNodeReveals[index].VSet("show_revealDepth", val > 0 ? val : DEL);
								newNodeReveals[index].show_revealDepth = val;
								RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
							}}/>
						</>}
					</Row>}
					{editing &&
					<Row>
						<CheckBox ml={5} text="Change focus level to:" value={nodeReveal.changeFocusLevelTo != null} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							if (val) {
								// when manually checking this box, setting to 0 is more common (since setting to 1 is auto-set for newly-dragged reveal-nodes)
								newNodeReveals[index].changeFocusLevelTo = 0;
							} else {
								delete newNodeReveals[index].changeFocusLevelTo;
							}
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
						<InfoButton text="While a node has a focus-level of 1+, the timeline will keep it in view while progressing through its steps (ie. during automatic scrolling and zooming)."/>
						{nodeReveal.changeFocusLevelTo != null &&
						<>
							<Spinner ml={5} value={nodeReveal.changeFocusLevelTo} onChange={val=>{
								const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
								newNodeReveals[index].changeFocusLevelTo = val;
								RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
							}}/>
						</>}
					</Row>}
					{editing &&
					<Row>
						<CheckBox ml={5} text="Set expanded to:" value={nodeReveal.setExpandedTo != null} onChange={val=>{
							const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
							if (val) {
								newNodeReveals[index].setExpandedTo = true;
							} else {
								delete newNodeReveals[index].setExpandedTo;
							}
							RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
						}}/>
						{nodeReveal.setExpandedTo != null &&
						<>
							<Select ml={5} options={{expanded: true, collapsed: false}} value={nodeReveal.setExpandedTo} onChange={(val: boolean)=>{
								const newNodeReveals = Clone(step.nodeReveals) as NodeReveal[];
								newNodeReveals[index].setExpandedTo = val;
								RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
							}}/>
						</>}
					</Row>}
					{editing &&
					<Row>
						<CheckBox ml={5} text="Hide" value={nodeReveal.hide ?? false} onChange={val=>{
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
import {CreateLinkCommand, GetMap, GetNode, GetNodeDisplayText, GetNodeID, GetNodeL3, GetParentNode, GetPathNodeIDs, GetTimeline, GetTimelineStep, GetTimelineSteps, NodeReveal, OrderKey, Polarity, TimelineStep} from "dm_common";
import {store} from "Store";
import {RootUIWrapper} from "UI/Root";
import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {DraggableInfo, DroppableInfo} from "Utils/UI/DNDStructures.js";
import {RunInAction} from "web-vcore";
import {GetAsync} from "web-vcore/.yalc/mobx-graphlink";
import {Assert, FromJSON, NN} from "web-vcore/nm/js-vextensions.js";
import {DropResult, ResponderProvided} from "web-vcore/nm/react-beautiful-dnd";
import {Button} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

export async function OnDragEnd(result: DropResult, provided: ResponderProvided) {
	if (result.destination == null) return;

	const sourceDroppableInfo = FromJSON(result.source.droppableId) as DroppableInfo;
	const sourceIndex = result.source.index as number;
	const targetDroppableInfo: DroppableInfo = FromJSON(result.destination.droppableId);
	let targetIndex = result.destination.index as number;
	const draggableInfo = FromJSON(result.draggableId) as DraggableInfo;

	if (targetDroppableInfo == null) {
	} else if (targetDroppableInfo.type == "NodeChildHolder") {
		// we don't support setting the actual order for nodes through dnd right now, so ignore if dragging onto same list
		if (result.destination && result.source.droppableId == result.destination.droppableId) return;

		const {parentPath: newParentPath} = targetDroppableInfo;
		const newParentID = NN(GetPathNodeIDs(newParentPath!).Last());
		const newParent = GetNodeL3.NN(newParentID);
		const polarity = targetDroppableInfo.subtype == "up" ? Polarity.supporting : Polarity.opposing;

		const {mapID, nodePath: draggedNodePath} = draggableInfo;
		const map = GetMap(mapID);
		Assert(draggedNodePath);
		const draggedNodeID = NN(GetPathNodeIDs(draggedNodePath!).Last());
		const draggedNode = GetNodeL3.NN(draggedNodeID);

		const copyCommand = CreateLinkCommand(mapID, draggedNodePath, newParentPath!, targetDroppableInfo.childGroup!, polarity, true);
		const moveCommand = CreateLinkCommand(mapID, draggedNodePath, newParentPath!, targetDroppableInfo.childGroup!, polarity, false);
		Assert(copyCommand && moveCommand);

		//if (copyCommand.Validate_Safe()) {
		if (await copyCommand.Validate_Async_Safe()) {
			ShowMessageBox({title: "Cannot copy/move node", message: `Reason: ${copyCommand.ValidateErrorStr}`});
			return;
		}

		const controller = ShowMessageBox({
			title: "Copy/move the dragged node?", okButton: false, cancelButton: false,
			message: `
				Are you sure you want to copy/move the dragged node?

				Destination (new parent): ${GetNodeDisplayText(newParent, null, map)}
				Dragged claim/argument: ${GetNodeDisplayText(draggedNode, null, map)}
			`.AsMultiline(0),
			extraButtons: ()=><>
				<Button text="Copy" onClick={async()=>{
					controller.Close();
					const {argumentWrapperID} = await copyCommand.RunOnServer();
					if (argumentWrapperID) {
						RunInAction("OnDragEnd.Copy.onClick", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentWrapperID, Date.now()));
					}
				}} />
				<Button ml={5} text="Move" enabled={moveCommand.Validate_Safe() == null} title={moveCommand.ValidateErrorStr} onClick={async()=>{
					controller.Close();
					const {argumentWrapperID} = await moveCommand.RunOnServer();
					if (argumentWrapperID) {
						RunInAction("OnDragEnd.Move.onClick", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentWrapperID, Date.now()));
					}
				}} />
				<Button ml={5} text="Cancel" onClick={()=>controller.Close()} />
			</>,
		});
	} else if (targetDroppableInfo.type == "TimelineStepList") {
		// if we're moving an item to later in the same list, increment the target-index again (since react-beautiful-dnd pre-applies target-index adjustment, unlike the rest of our code that uses UpdateTimelineStepsOrder/Array.Move())
		if (sourceDroppableInfo.type == targetDroppableInfo.type && sourceIndex < targetIndex) {
			targetIndex++;
		}

		const {newBefore, newAfter} = await GetAsync(()=>{
			const timeline = GetTimeline(targetDroppableInfo.timelineID!);
			const steps = GetTimelineSteps(targetDroppableInfo.timelineID!);
			return {
				newBefore: targetIndex == 0 ? null : steps[targetIndex - 1],
				newAfter: steps[targetIndex] as TimelineStep|null,
			};
		});

		const newOrderKey = OrderKey.between(newBefore?.orderKey, newAfter?.orderKey);
		RunCommand_UpdateTimelineStep({id: draggableInfo.stepID!, updates: {orderKey: newOrderKey.toString()}});
	} else if (targetDroppableInfo.type == "TimelineStepNodeRevealList") {
		const path = draggableInfo.nodePath!;
		const draggedNode = GetNode(GetNodeID(path));
		/*const parentNode = GetParentNode(path);
		// if dragged-node is the premise of a single-premise argument, use the argument-node instead (the UI for the argument and claim are combined, but user probably wanted the whole argument dragged)
		if (IsPremiseOfSinglePremiseArgument(draggedNode, parentNode)) {
			path = GetParentPath(path);
		}*/

		const step = GetTimelineStep(targetDroppableInfo.stepID);
		if (step == null) return;
		const newNodeReveal = new NodeReveal({
			path,
			show: true,
			changeFocusLevelTo: 1,
		});
		const newNodeReveals = (step.nodeReveals || []).concat(newNodeReveal);
		RunCommand_UpdateTimelineStep({id: step.id, updates: {nodeReveals: newNodeReveals}});
	}
}
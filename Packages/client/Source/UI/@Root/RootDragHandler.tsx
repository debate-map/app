import {CreateLinkCommand, GetNodeDisplayText, GetNodeL3, GetPathNodeIDs, Polarity} from "dm_common";
import {store} from "Store";
import {RootUIWrapper} from "UI/Root";
import {DraggableInfo, DroppableInfo} from "Utils/UI/DNDStructures.js";
import {RunInAction} from "web-vcore";
import {Assert, FromJSON, NN} from "web-vcore/nm/js-vextensions.js";
import {Button} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

export async function OnDragEnd(self: RootUIWrapper, result: any) {
	const sourceDroppableInfo = FromJSON(result.source.droppableId) as DroppableInfo;
	const sourceIndex = result.source.index as number;
	const targetDroppableInfo: DroppableInfo = result.destination && FromJSON(result.destination.droppableId);
	const targetIndex = result.destination && result.destination.index as number;
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

				Destination (new parent): ${GetNodeDisplayText(newParent)}
				Dragged claim/argument: ${GetNodeDisplayText(draggedNode)}
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
	} /*else if (targetDroppableInfo.type == "TimelineStepList") {
		// if we're moving an item to later in the same list, increment the target-index again (since react-beautiful-dnd pre-applies target-index adjustment, unlike the rest of our code that uses UpdateTimelineStepsOrder/Array.Move())
		if (sourceDroppableInfo.type == targetDroppableInfo.type && sourceIndex < targetIndex) {
			targetIndex++;
		}

		new UpdateTimelineStepOrder({timelineID: sourceDroppableInfo.timelineID, stepID: draggableInfo.stepID, newIndex: targetIndex}).RunOnServer();
	} else if (targetDroppableInfo.type == "TimelineStepNodeRevealList") {
		let path = draggableInfo.nodePath;
		const draggedNode = GetNode(GetNodeID(path));
		const parentNode = GetParentNode(path);
		// if dragged-node is the premise of a single-premise argument, use the argument-node instead (the UI for the argument and claim are combined, but user probably wanted the whole argument dragged)
		if (IsPremiseOfSinglePremiseArgument(draggedNode, parentNode)) {
			path = GetParentPath(path);
		}

		const step = GetTimelineStep(targetDroppableInfo.stepID);
		const newNodeReveal = new NodeReveal();
		newNodeReveal.path = path;
		newNodeReveal.show = true;
		const newNodeReveals = (step.nodeReveals || []).concat(newNodeReveal);
		new UpdateTimelineStep({stepID: step.id, stepUpdates: {nodeReveals: newNodeReveals}}).RunOnServer();
	}*/
}
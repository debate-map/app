import {E} from "js-vextensions";
import {Button} from "react-vcomponents";
import {BaseComponent, UseCallback} from "react-vextensions";
import {GADDemo} from "Source/UI/@GAD/GAD";
import {ShowSignInPopup} from "Source/UI/@Shared/NavBar/UserPanel";
import {HSLA, Observer} from "vwebapp-framework";
import {useCallback, useMemo, useEffect} from "react";
import {MapNodeL3, Polarity, ClaimForm} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNode";
import {GetNodeColor, MapNodeType} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNodeType";
import {GetParentNodeL3} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes";
import {GetPolarityShortStr, GetNodeContributionInfo, NodeContributionInfo_ForPolarity, ReversePolarity} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/$node";
import {MeID} from "Subrepos/Server/Source/@Shared/Store/firebase/users";
import {Map} from "Subrepos/Server/Source/@Shared/Store/firebase/maps/@Map";
import {ShowAddChildDialog} from "../NodeUI_Menu/Dialogs/AddChildDialog";

type Props = {map: Map, node: MapNodeL3, path: string, polarity: Polarity, style?};
/* const dropTargetDecorator = DropTarget('node',
	{
		canDrop(props: Props, monitor) {
			const { map, node: draggedNode, path: draggedNodePath } = monitor.getItem();
			const { node: dropOnNode, path: dropOnNodePath, polarity } = props;
			// if (!monitor.isOver({shallow: true})) return false;

			if (dropOnNode === draggedNode) return false; // if we`re dragging item onto itself, reject

			const linkCommand = CreateLinkCommand(map, draggedNode, draggedNodePath, dropOnNode, dropOnNodePath, polarity);
			const error = LinkNode_HighLevel_GetCommandError(linkCommand);
			if (error) return false;

			return true;
		},
		drop(props: Props, monitor, dropTarget: any) {
			if (monitor.didDrop()) return;

			const { map, node: draggedNode, path: draggedNodePath } = monitor.getItem();
			const { node: dropOnNode, path: dropOnNodePath, polarity } = props;

			const linkCommand = CreateLinkCommand(map, draggedNode, draggedNodePath, dropOnNode, dropOnNodePath, polarity);
			const error = LinkNode_HighLevel_GetCommandError(linkCommand);
			if (error) return;

			ShowMessageBox({
				title: `${ctrlDown ? 'Copy' : 'Move'} node as new argument?`, cancelButton: true,
				message: `
					Are you sure you want to ${ctrlDown ? 'copy' : 'move'} the dragged node as a new argument?

					Destination (new parent): ${GetNodeDisplayText(dropOnNode)}
					Dragged claim/argument: ${GetNodeDisplayText(draggedNode)}
				`.AsMultiline(0),
				onOK: async () => {
					const { argumentWrapperID } = await linkCommand.Run();
					if (argumentWrapperID) {
						store.dispatch(new ACTSetLastAcknowledgementTime({ nodeID: argumentWrapperID, time: Date.now() }));
					}
				},
			});
		},
	},
	(connect, monitor) => ({
		connectDropTarget: connect.dropTarget(),
		canDrop: monitor.canDrop(),
		isOver: monitor.isOver(), // ({shallow: true}),
		draggedItem: monitor.getItem(),
	})); */
// export class AddArgumentButton_Old extends BaseComponent<Props, {}> {
@Observer
export class AddArgumentButton extends BaseComponent<Props> {
	render() {
		const {map, node, path, polarity, style} = this.props;
		const backgroundColor = GetNodeColor({type: MapNodeType.Argument, displayPolarity: polarity} as MapNodeL3);
		const parent = GetParentNodeL3(path);

		const polarity_short = GetPolarityShortStr(polarity);
		const contributeInfo = GetNodeContributionInfo(node._key, MeID());
		const contributeInfo_polarity = contributeInfo[`${polarity_short}Args`] as NodeContributionInfo_ForPolarity;

		return (
			<Button
				text={`Add ${polarity_short}`} title={`Add ${Polarity[polarity].toLowerCase()} argument`}
				enabled={contributeInfo_polarity.canAdd}
				// text={`Add ${Polarity[polarity].toLowerCase()} argument`}
				style={E(
					{
						alignSelf: "flex-end", backgroundColor: backgroundColor.css(),
						border: "none", boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
						// width: 150, padding: "2px 12px",
						width: 60, padding: "2px 12px",
						":hover": {backgroundColor: backgroundColor.Mix("white", 0.05).alpha(0.9).css()},
					},
					/* polarity == Polarity.Supporting && {marginBottom: 5},
					polarity == Polarity.Opposing && {marginTop: 5}, */
					{height: 17, fontSize: 11, padding: "0 12px"}, // vertical
					// {fontSize: 18, padding: "0 12px"}, // horizontal
					// canDrop && { outline: `1px solid ${isOver ? 'yellow' : 'white'}` },
					GADDemo && {color: HSLA(222, 0.1, 0.8, 1), fontFamily: "TypoPRO Bebas Neue", fontSize: 13, letterSpacing: 1},
					style,
				)}
				onClick={UseCallback(e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					if (contributeInfo_polarity.hostNodeID == node._key) {
						let newChildPolarity = polarity;
						//GetFinalPolarity(polarity, parent.link.form);
						// if display polarity is different then base polarity, we need to reverse the new-child polarity
						/*if (node.link.polarity && node.displayPolarity != node.link.polarity) {
							newChildPolarity = ReversePolarity(newChildPolarity);
						}*/
						// if parent is a claim "shown as negation", we need to reverse the new-child polarity
						if (node.link.form == ClaimForm.Negation) {
							newChildPolarity = ReversePolarity(newChildPolarity);
						}
						ShowAddChildDialog(path, MapNodeType.Argument, newChildPolarity, MeID(), map._key);
					} else {
						let newChildPolarity = polarity;
						if (contributeInfo_polarity.reversePolarities) {
							newChildPolarity = ReversePolarity(newChildPolarity);
						}
						ShowAddChildDialog(contributeInfo_polarity.hostNodeID, MapNodeType.Argument, newChildPolarity, MeID(), map._key);
					}
				}, [contributeInfo_polarity.hostNodeID, contributeInfo_polarity.reversePolarities, map._key, node._key, node.link.form, path, polarity])}/>
		);
	}
}
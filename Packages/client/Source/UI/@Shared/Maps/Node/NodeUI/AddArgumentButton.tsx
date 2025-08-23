import {E} from "js-vextensions";
import {Button} from "react-vcomponents";
import {UseCallback} from "react-vextensions";
import {SLMode, ShowHeader} from "UI/@SL/SL.js";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {HSLA} from "web-vcore";
import {NodeL3, Polarity, ClaimForm, NodeType, GetPolarityShortStr, GetNodeContributionInfo, NodeContributionInfo_ForPolarity, ReversePolarity, MeID, DMap, ChildGroup, NewChildConfig} from "dm_common";
import {GetNodeColor} from "Store/db_ext/nodes";
import {Chroma_Mix} from "Utils/ClassExtensions/CE_General.js";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {ShowAddChildDialog} from "../NodeUI_Menu/Dialogs/AddChildDialog.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

type Props = {
	map: DMap,
	node: NodeL3,
	path: string,
	group: ChildGroup,
	polarity: Polarity,
	style?: any
};

export const AddArgumentButton = observer_mgl((props: Props)=>{
	const {map, node, path, group, polarity, style} = props;
	const backgroundColor = GetNodeColor({type: NodeType.argument, displayPolarity: polarity} as NodeL3, "background", false);

	const polarity_short = GetPolarityShortStr(polarity);
	const contributeInfo = GetNodeContributionInfo(node.id);
	const contributeInfo_polarity = contributeInfo[`${polarity_short}Args`] as NodeContributionInfo_ForPolarity;
	// if in iframe/no-header mode, have the add-argument-buttons always disabled
	// (the sign-in dialog is too confusing there atm: small container, signs into different website [possibly with CORS complications], and most linked maps would have 3rd-party node-adding disabled anyway)
	const enabled = contributeInfo_polarity.canAdd && ShowHeader;

	const text =
		group == ChildGroup.truth ? (polarity == Polarity.supporting ? "Add: True..." : "Add: False...") :
		group == ChildGroup.relevance ? (polarity == Polarity.supporting ? "Add: Relevance +" : "Add: Relevance -") :
		"<invalid>";

	return (
		<Button
			text={text} title={`Add ${Polarity[polarity].toLowerCase()} argument`}
			enabled={enabled}
			style={E(
				{
					alignSelf: "flex-end", backgroundColor: backgroundColor.css(),
					border: "none", boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
					width: group == ChildGroup.truth ? 70 : 90, padding: "2px 12px",
					":hover": {backgroundColor: Chroma_Mix(backgroundColor, "white", 0.05).alpha(0.9).css()},
				},
				/* polarity == Polarity.supporting && {marginBottom: 5},
				polarity == Polarity.opposing && {marginTop: 5}, */
				{height: 17, fontSize: group == ChildGroup.truth ? 10 : 9, padding: "0 12px"}, // vertical
				// {fontSize: 18, padding: "0 12px"}, // horizontal
				// canDrop && { outline: `1px solid ${isOver ? 'yellow' : 'white'}` },
				SLMode && {color: HSLA(222, 0.1, 0.8, 1), fontFamily: SLSkin.main.MainFont() /*fontSize: 12, letterSpacing: 1*/},
				style,
			)}
			onClick={UseCallback(e=>{
				if (e.button != 0) return;
				if (MeID() == null) return ShowSignInPopup();
				const userID = MeID.NN();

				let newChild_parentPath = path;
				let newChildPolarity = polarity;
				if (contributeInfo_polarity.hostNodeID == node.id) {
					//GetFinalPolarity(polarity, parent.link.form);
					// if display polarity is different then base polarity, we need to reverse the new-child polarity
					/*if (node.link.polarity && node.displayPolarity != node.link.polarity) {
						newChildPolarity = ReversePolarity(newChildPolarity);
					}*/
					// if parent is a claim "shown as negation", we need to reverse the new-child polarity
					if (node.link?.form == ClaimForm.negation) {
						newChildPolarity = ReversePolarity(newChildPolarity);
					}
				} else {
					if (contributeInfo_polarity.reversePolarities) {
						newChildPolarity = ReversePolarity(newChildPolarity);
					}
					newChild_parentPath = contributeInfo_polarity.hostNodeID;
				}
				const newChildConfig = new NewChildConfig({childType: NodeType.argument, childGroup: group, polarity: newChildPolarity, addWrapperArg: false});
				ShowAddChildDialog(newChild_parentPath, newChildConfig, userID, map.id);
			}, [contributeInfo_polarity.hostNodeID, contributeInfo_polarity.reversePolarities, group, map.id, node.id, node.link?.form, path, polarity])}/>
	);
});

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
					const { argumentWrapperID } = await linkCommand.RunOnServer();
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

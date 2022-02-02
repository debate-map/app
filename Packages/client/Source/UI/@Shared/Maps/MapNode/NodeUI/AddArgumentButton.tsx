import {E} from "web-vcore/nm/js-vextensions.js";
import {Button} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, UseCallback} from "web-vcore/nm/react-vextensions.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {HSLA, Observer} from "web-vcore";
import {useCallback, useMemo, useEffect} from "react";
import {MapNodeL3, Polarity, ClaimForm, MapNodeType, GetParentNodeL3, GetPolarityShortStr, GetNodeContributionInfo, NodeContributionInfo_ForPolarity, ReversePolarity, MeID, Map, ChildGroup} from "dm_common";
import {GetNodeColor} from "Store/db_ext/nodes";
import {Chroma_Mix} from "Utils/ClassExtensions/CE_General.js";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {ShowAddChildDialog} from "../NodeUI_Menu/Dialogs/AddChildDialog.js";
import {Assert} from "../../../../../../../../../../@Modules/web-vcore/Main/node_modules/react-vextensions/Dist/Internals/FromJSVE.js";

type Props = {map: Map, node: MapNodeL3, path: string, group: ChildGroup, polarity: Polarity, style?};
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
@Observer
export class AddArgumentButton extends BaseComponent<Props> {
	render() {
		const {map, node, path, group, polarity, style} = this.props;
		const backgroundColor = GetNodeColor({type: MapNodeType.argument, displayPolarity: polarity} as MapNodeL3, "background", false);
		const parent = GetParentNodeL3(path);

		const polarity_short = GetPolarityShortStr(polarity);
		const contributeInfo = GetNodeContributionInfo(node.id);
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
						":hover": {backgroundColor: Chroma_Mix(backgroundColor, "white", 0.05).alpha(0.9).css()},
					},
					/* polarity == Polarity.supporting && {marginBottom: 5},
					polarity == Polarity.opposing && {marginTop: 5}, */
					{height: 17, fontSize: 11, padding: "0 12px"}, // vertical
					// {fontSize: 18, padding: "0 12px"}, // horizontal
					// canDrop && { outline: `1px solid ${isOver ? 'yellow' : 'white'}` },
					GADDemo && {color: HSLA(222, 0.1, 0.8, 1), fontFamily: SLSkin.main.MainFont() /*fontSize: 12, letterSpacing: 1*/},
					style,
				)}
				onClick={UseCallback(e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();
					const userID = MeID.NN();

					if (contributeInfo_polarity.hostNodeID == node.id) {
						let newChildPolarity = polarity;
						//GetFinalPolarity(polarity, parent.link.form);
						// if display polarity is different then base polarity, we need to reverse the new-child polarity
						/*if (node.link.polarity && node.displayPolarity != node.link.polarity) {
							newChildPolarity = ReversePolarity(newChildPolarity);
						}*/
						// if parent is a claim "shown as negation", we need to reverse the new-child polarity
						if (node.link?.form == ClaimForm.negation) {
							newChildPolarity = ReversePolarity(newChildPolarity);
						}
						ShowAddChildDialog(path, MapNodeType.argument, newChildPolarity, userID, group, map.id);
					} else {
						let newChildPolarity = polarity;
						if (contributeInfo_polarity.reversePolarities) {
							newChildPolarity = ReversePolarity(newChildPolarity);
						}
						ShowAddChildDialog(contributeInfo_polarity.hostNodeID, MapNodeType.argument, newChildPolarity, userID, group, map.id);
					}
				}, [contributeInfo_polarity.hostNodeID, contributeInfo_polarity.reversePolarities, group, map.id, node.id, node.link?.form, path, polarity])}/>
		);
	}
}
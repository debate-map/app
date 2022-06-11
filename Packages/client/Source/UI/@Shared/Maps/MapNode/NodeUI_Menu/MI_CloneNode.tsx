import {GetParentNodeID, LinkNode_HighLevel, MapNodeType, MeID} from "dm_common";
import React from "react";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {Observer} from "web-vcore";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {MI_SharedProps} from "../NodeUI_Menu.jsx";
import {PayloadOf, ShowTransferNodeDialog, TransferNodesPayload} from "./Dialogs/TransferNodeDialog.js";

@Observer
export class MI_CloneNode extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path, childGroup, combinedWithParentArg, inList} = this.props;
		if (inList) return null;

		let pathToClone = path;
		if (node.type == MapNodeType.claim && combinedWithParentArg) {
			pathToClone = SlicePath(path, 1)!;
		}
		const parentID = GetParentNodeID(path);
		if (parentID == null) return null; // cannot clone a map's root-node (for now anyway)

		return (
			<VMenuItem text="Clone"
				style={liveSkin.Style_VMenuItem()} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					//const formForClaimChildren = node.type == MapNodeType.category ? ClaimForm.question : ClaimForm.base;

					const commandData_initial: TransferNodesPayload = {
						mapID: map?.id, oldParentID: parentID, newParentID: parentID, nodeID: node.id,
						newForm: null, newPolarity: null,
						//createWrapperArg?: boolean,
						childGroup,
						//linkAsArgument?: boolean,
						unlinkFromOldParent: false,
						deleteEmptyArgumentWrapper: false,
					};

					ShowTransferNodeDialog(commandData_initial, "Clone node in-place");
				}}/>
		);
	}
}
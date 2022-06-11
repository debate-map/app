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
import {GetTransferNodesInitialPayload} from "./MI_Paste.js";

@Observer
export class MI_CloneNode extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path, childGroup, combinedWithParentArg, inList} = this.props;
		if (inList) return null;
		//const formForClaimChildren = node.type == MapNodeType.category ? ClaimForm.question : ClaimForm.base;

		let pathToClone = path;
		if (node.type == MapNodeType.claim && combinedWithParentArg) {
			pathToClone = SlicePath(path, 1)!;
		}
		const parentID = GetParentNodeID(path);
		if (parentID == null) return null; // cannot clone a map's root-node (for now anyway)

		const commandData_initial = GetTransferNodesInitialPayload(node, path, parentID, childGroup, "clone");
		if (commandData_initial == false) return;

		return (
			<VMenuItem text="Clone"
				style={liveSkin.Style_VMenuItem()} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					ShowTransferNodeDialog(commandData_initial, "Clone node in-place");
				}}/>
		);
	}
}
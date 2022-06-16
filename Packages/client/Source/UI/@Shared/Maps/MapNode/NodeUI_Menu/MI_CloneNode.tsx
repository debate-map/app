import {GetNodeL3, GetParentNodeL3, MapNodeType, MeID} from "dm_common";
import React from "react";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {Observer} from "web-vcore";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {MI_SharedProps} from "../NodeUI_Menu.jsx";
import {ShowTransferNodeDialog} from "./Dialogs/TransferNodeDialog.js";
import {GetTransferNodesInitialData} from "./Dialogs/TransferNodeDialog/TransferNodeData.js";

@Observer
export class MI_CloneNode extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path, childGroup, combinedWithParentArg, inList} = this.props;
		if (inList) return null;
		//const formForClaimChildren = node.type == MapNodeType.category ? ClaimForm.question : ClaimForm.base;

		// we "initiate a clone" for the "outer" argument node, if there's a box combining an argument and claim (this is how the dialog expects such a case)
		let pathToClone = path;
		if (node.type == MapNodeType.claim && combinedWithParentArg) {
			pathToClone = SlicePath(path, 1)!;
		}
		const nodeToClone = GetNodeL3(pathToClone);
		if (nodeToClone == null) return null; // node just deleted?

		const parentOfNodeToClone = GetParentNodeL3(pathToClone);
		if (parentOfNodeToClone == null || nodeToClone.link == null) return null; // cannot clone a map's root-node (for now anyway)

		const [commandData_initial, uiState_initial] = GetTransferNodesInitialData(nodeToClone, pathToClone, parentOfNodeToClone, nodeToClone.link.group, "clone");
		if (commandData_initial == null || uiState_initial == null) return;

		return (
			<VMenuItem text={<span>Clone <span style={{fontSize: 10, opacity: 0.7}}>(for independent* duplicate)</span></span> as any}
				style={liveSkin.Style_VMenuItem()} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					ShowTransferNodeDialog(commandData_initial, uiState_initial, "Clone node in-place");
				}}/>
		);
	}
}
import {GetNodeL3, GetParentNodeL3, MeID, TransferType} from "dm_common";
import React from "react";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {VMenuItem} from "react-vmenu";
import {MI_SharedProps} from "../NodeUI_Menu.jsx";
import {ShowTransferNodeDialog, TransferNodeNeedsWrapper} from "./Dialogs/TransferNodeDialog.js";
import {GetTransferNodesInitialData} from "./Dialogs/TransferNodeDialog/TransferNodeData.js";
import {observer_mgl} from "mobx-graphlink";

export const MI_CloneNode = observer_mgl((props: MI_SharedProps)=>{
	const {map, path} = props;
	if (map == null) return null;

	// we "initiate a clone" for the "outer" argument node, if there's a box combining an argument and claim (this is how the dialog expects such a case)
	const pathToClone = path;
	const nodeToClone = GetNodeL3(pathToClone);
	if (nodeToClone == null) return null; // node just deleted?

	const parentOfNodeToClone = GetParentNodeL3(pathToClone);
	if (parentOfNodeToClone == null || nodeToClone.link == null) return null; // cannot clone a map's root-node (for now anyway)

	const [payload_initial, uiState_initial] = GetTransferNodesInitialData(map, nodeToClone, pathToClone, parentOfNodeToClone, nodeToClone.link.group, TransferType.clone);
	if (payload_initial == null || uiState_initial == null) return;

	// if cloning, and its an arg+claim combo
	if (payload_initial.nodes[0].transferType == TransferType.clone && payload_initial.nodes.length > 1) {
		// maybe temp: if arg can be "shimmed", default to that; else, default to "ignore"
		const argCanBeShim = TransferNodeNeedsWrapper(payload_initial.nodes[1], uiState_initial);
		if (argCanBeShim) {
			payload_initial.nodes[0].transferType = TransferType.shim;
		} else {
			payload_initial.nodes[0].transferType = TransferType.ignore;
		}
	}

	return (
		<VMenuItem text={<span>Clone <span style={{fontSize: 10, opacity: 0.7}}>(for independent* duplicate)</span></span> as any}
			style={liveSkin.Style_VMenuItem()} onClick={e=>{
				if (e.button != 0) return;
				if (MeID() == null) return ShowSignInPopup();

				ShowTransferNodeDialog(payload_initial, uiState_initial, "Clone node in-place");
			}}/>
	);
});

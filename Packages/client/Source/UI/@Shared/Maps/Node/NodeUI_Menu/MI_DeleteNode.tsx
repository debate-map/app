import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {MeID, GetNodeDisplayText, CheckUserCanDeleteNode, NodeType, GetNodeChildren, PERMISSIONS} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunCommand_DeleteNode} from "Utils/DB/Command.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

export const MI_DeleteNode = observer_mgl((props: MI_SharedProps)=>{
	const {map, mapID, node, path} = props;
	if (!PERMISSIONS.Node.Delete(MeID(), node)) return null;
	const nodeText = GetNodeDisplayText(node, path, map);

	const topLevelCommentNodes = GetNodeChildren(node.id).filter(n=>n.type === NodeType.comment);
	const nodeError = CheckUserCanDeleteNode(MeID(), node, {childrenToIgnore: topLevelCommentNodes.map(n=>n.id)});

	return (
		<VMenuItem text="Delete"
			//enabled={command.Validate_Safe() == null} title={command.ValidateErrorStr}
			enabled={nodeError == null} title={nodeError}
			style={liveSkin.Style_VMenuItem()} onClick={e=>{
				if (e.button != 0) return;

				//const contextStr = IsNodeSubnode(node) ? ", and its placement in-layer" : ", and its link with 1 parent";
				const contextStr = ", and its link with 1 parent";

				ShowMessageBox({
					title: `Delete "${nodeText}"`, cancelButton: true,
					message: `Delete the node "${nodeText}"${contextStr}?`,
					onOK: async()=>{
						//await command.RunOnServer();
						await RunCommand_DeleteNode({mapID, nodeID: node.id});
					},
				});
			}}/>
	);
});

import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {MeID, GetParentNodeL3, GetNodeDisplayText, PERMISSIONS} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunCommand_DeleteNodeLink} from "Utils/DB/Command.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

export const MI_UnlinkNode = observer_mgl((props: MI_SharedProps)=>{
	const {map, node, path} = props;

	if (!PERMISSIONS.Node.Modify(MeID(), node)) return null;
	if (map == null) return null;
	const parent = GetParentNodeL3(path);
	if (parent == null) return null;
	const nodeText = GetNodeDisplayText(node, path, map);

	return (
		<VMenuItem text="Unlink"
			style={liveSkin.Style_VMenuItem()} onClick={async e=>{
				if (e.button != 0) return;

				const parentText = GetNodeDisplayText(parent, path.substr(0, path.lastIndexOf("/")), map);
				ShowMessageBox({
					title: `Unlink child "${nodeText}"`,
					cancelButton: true,
					message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
					onOK: async()=>{
						await RunCommand_DeleteNodeLink({id: node.link!.id});
					},
				});
			}}/>
	);
});

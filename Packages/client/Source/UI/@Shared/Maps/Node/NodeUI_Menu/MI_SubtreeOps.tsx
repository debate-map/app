import {liveSkin} from "Utils/Styles/SkinManager.js";
import {GetNodeDisplayText, HasModPermissions, MeID} from "dm_common";
import React from "react";
import {BaseComponentPlus} from "react-vextensions";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {Observer} from "web-vcore";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {SubtreeOpsDialog} from "./Dialogs/SubtreeOpsDialog.js";

@Observer
export class MI_SubtreeOps extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {node, path, map} = this.props;
		const sharedProps = this.props as MI_SharedProps;
		if (!HasModPermissions(MeID())) return null; // for now, require mod permissions (since no quotas or other restrictions are in place)
		return (
			<VMenuItem text="Export subtree (+other ops)" style={liveSkin.Style_VMenuItem()} onClick={async e=>{
				if (e.button != 0) return;
				let ui: SubtreeOpsDialog|n;
				const controller = ShowMessageBox({
					title: `Subtree operations, for nodes under: "${GetNodeDisplayText(node, path, map)}"`,
					okButton: false, buttonBarStyle: {display: "none"},
					message: ()=><SubtreeOpsDialog ref={c=>ui = c} {...sharedProps} controller={controller}/>,
				});
			}}/>
		);
	}
}
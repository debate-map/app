import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {IsUserCreatorOrMod, MeID, GetNodeDisplayText, DeleteNode, ChildGroup, CheckUserCanDeleteNode} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunCommand_DeleteNode} from "Utils/DB/Command.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_DeleteNode extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {map, mapID, node, path, childGroup} = this.props;
		const componentBox = childGroup != ChildGroup.generic;
		if (!IsUserCreatorOrMod(MeID(), node) || componentBox) return null;
		const nodeText = GetNodeDisplayText(node, path, map);

		//const command = new DeleteNode(E({mapID, nodeID: node.id}));
		const error = CheckUserCanDeleteNode(MeID(), node);
		return (
			<VMenuItem text="Delete"
				//enabled={command.Validate_Safe() == null} title={command.ValidateErrorStr}
				enabled={error == null} title={error}
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
	}
}
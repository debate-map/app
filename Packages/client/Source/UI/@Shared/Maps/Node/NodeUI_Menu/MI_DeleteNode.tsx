import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {IsUserCreatorOrMod, MeID, GetNodeDisplayText, DeleteNode, ChildGroup} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_DeleteNode extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {map, mapID, node, path, childGroup, combinedWithParentArg} = this.props;
		const componentBox = childGroup != ChildGroup.generic;
		if (!IsUserCreatorOrMod(MeID(), node) || componentBox) return null;
		const nodeText = GetNodeDisplayText(node, path);

		const command = new DeleteNode(E({mapID, nodeID: node.id}));
		return (
			<VMenuItem text={`Delete${combinedWithParentArg ? " claim" : ""}`}
				enabled={command.Validate_Safe() == null} title={command.ValidateErrorStr}
				style={liveSkin.Style_VMenuItem()} onClick={e=>{
					if (e.button != 0) return;

					//const contextStr = IsNodeSubnode(node) ? ", and its placement in-layer" : ", and its link with 1 parent";
					const contextStr = ", and its link with 1 parent";

					ShowMessageBox({
						title: `Delete "${nodeText}"`, cancelButton: true,
						message: `Delete the node "${nodeText}"${contextStr}?`,
						onOK: async()=>{
							await command.RunOnServer();
						},
					});
				}}/>
		);
	}
}
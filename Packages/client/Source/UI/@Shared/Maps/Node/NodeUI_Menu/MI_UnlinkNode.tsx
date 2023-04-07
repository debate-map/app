import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {Observer} from "web-vcore";
import {ChildGroup, IsUserCreatorOrMod, MeID, GetParentNodeL3, GetNodeDisplayText, UnlinkNode} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunCommand_DeleteNodeLink} from "Utils/DB/Command.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_UnlinkNode extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {map, mapID, node, path, childGroup, inList} = this.props;
		if (!IsUserCreatorOrMod(MeID(), node)) return null;
		if (inList) return null;
		const componentBox = childGroup != ChildGroup.generic;
		if (componentBox) return null;
		const parent = GetParentNodeL3(path);
		if (parent == null) return null;
		const nodeText = GetNodeDisplayText(node, path, map);

		//const command = new UnlinkNode({mapID, parentID: parent.id, childID: node.id});
		return (
			<VMenuItem text="Unlink"
				//enabled={command.Validate_Safe() == null} title={command.ValidateErrorStr}
				style={liveSkin.Style_VMenuItem()} onClick={async e=>{
					if (e.button != 0) return;
					const parentText = GetNodeDisplayText(parent, path.substr(0, path.lastIndexOf("/")), map);
					ShowMessageBox({
						title: `Unlink child "${nodeText}"`, cancelButton: true,
						message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
						onOK: async()=>{
							//command.RunOnServer();
							await RunCommand_DeleteNodeLink({/*mapID,*/ id: node.link!.id});
						},
					});
				}}/>
		);
	}
}
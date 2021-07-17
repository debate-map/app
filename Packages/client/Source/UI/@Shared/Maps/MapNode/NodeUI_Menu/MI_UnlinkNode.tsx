import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {styles} from "Utils/UI/GlobalStyles.js";
import {Observer} from "web-vcore";
import {IsUserCreatorOrMod} from "dm_common";
import {MeID} from "dm_common";
import {GetParentNodeL3} from "dm_common";
import {GetNodeDisplayText} from "dm_common";
import {UnlinkNode} from "dm_common";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_UnlinkNode extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {map, mapID, node, path, holderType, combinedWithParentArg, inList} = this.props;
		if (!IsUserCreatorOrMod(MeID(), node)) return null;
		if (inList) return null;
		const componentBox = holderType != null;
		if (componentBox) return null;
		const parent = GetParentNodeL3(path);
		if (parent == null) return null;
		const nodeText = GetNodeDisplayText(node, path);

		const command = new UnlinkNode({mapID, parentID: parent.id, childID: node.id});
		return (
			<VMenuItem text={`Unlink${combinedWithParentArg ? " claim" : ""}`}
				enabled={command.Validate_Safe() == null} title={command.validateError}
				style={styles.vMenuItem} onClick={async e=>{
					if (e.button != 0) return;
					const parentText = GetNodeDisplayText(parent, path.substr(0, path.lastIndexOf("/")));
					ShowMessageBox({
						title: `Unlink child "${nodeText}"`, cancelButton: true,
						message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
						onOK: ()=>{
							command.RunOnServer();
						},
					});
				}}/>
		);
	}
}
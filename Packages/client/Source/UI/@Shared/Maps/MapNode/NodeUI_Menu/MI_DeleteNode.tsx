import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {VMenuItem} from "web-vcore/nm/react-vmenu";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {styles} from "Utils/UI/GlobalStyles";
import {Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions";
import {IsUserCreatorOrMod} from "dm_common";
import {MeID} from "dm_common";
import {GetNodeDisplayText} from "dm_common";
import {DeleteNode} from "dm_common";
import {MI_SharedProps} from "../NodeUI_Menu";

@Observer
export class MI_DeleteNode extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {map, mapID, node, path, holderType, combinedWithParentArg} = this.props;
		const componentBox = holderType != null;
		if (!IsUserCreatorOrMod(MeID(), node) || componentBox) return null;
		const nodeText = GetNodeDisplayText(node, path);

		const command = new DeleteNode(E({mapID, nodeID: node.id}));
		return (
			<VMenuItem text={`Delete${combinedWithParentArg ? " claim" : ""}`}
				enabled={command.Validate_Safe() == null} title={command.validateError}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;

					//const contextStr = IsNodeSubnode(node) ? ", and its placement in-layer" : ", and its link with 1 parent";
					const contextStr = ", and its link with 1 parent";

					ShowMessageBox({
						title: `Delete "${nodeText}"`, cancelButton: true,
						message: `Delete the node "${nodeText}"${contextStr}?`,
						onOK: async()=>{
							await command.Run();
						},
					});
				}}/>
		);
	}
}
import {BaseComponentPlus} from "react-vextensions";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {styles} from "Source/Utils/UI/GlobalStyles";
import {Observer} from "vwebapp-framework";
import {E} from "js-vextensions";
import {IsUserCreatorOrMod} from "Subrepos/Server/Source/@Shared/Store/firebase/users/$user";
import {MeID} from "Subrepos/Server/Source/@Shared/Store/firebase/users";
import {GetNodeDisplayText} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/$node";
import {DeleteNode} from "Subrepos/Server/Source/@Shared/Commands/DeleteNode";
import {IsNodeSubnode} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes";
import {MI_SharedProps} from "../NodeUI_Menu";

@Observer
export class MI_DeleteNode extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {map, mapID, node, path, holderType, combinedWithParentArg} = this.props;
		const componentBox = holderType != null;
		if (!IsUserCreatorOrMod(MeID(), node) || componentBox) return null;
		const nodeText = GetNodeDisplayText(node, path);

		const command = new DeleteNode(E({mapID, nodeID: node._key}));
		return (
			<VMenuItem text={`Delete${combinedWithParentArg ? " claim" : ""}`}
				enabled={command.Validate_Safe() == null} title={command.validateError}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;

					const contextStr = IsNodeSubnode(node) ? ", and its placement in-layer" : ", and its link with 1 parent";

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
import {BaseComponentPlus} from "react-vextensions";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {styles} from "Source/Utils/UI/GlobalStyles";
import {Observer} from "vwebapp-framework";
import {IsUserCreatorOrMod} from "@debate-map/server-link/Source/Link";
import {MeID} from "@debate-map/server-link/Source/Link";
import {GetParentNodeL3} from "@debate-map/server-link/Source/Link";
import {GetNodeDisplayText} from "@debate-map/server-link/Source/Link";
import {UnlinkNode} from "@debate-map/server-link/Source/Link";
import {MI_SharedProps} from "../NodeUI_Menu";

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

		const command = new UnlinkNode({mapID, parentID: parent._key, childID: node._key});
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
							command.Run();
						},
					});
				}}/>
		);
	}
}
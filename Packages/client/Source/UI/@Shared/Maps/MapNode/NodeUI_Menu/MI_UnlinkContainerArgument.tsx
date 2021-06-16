import {SlicePath} from "web-vcore/nm/mobx-graphlink";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {styles} from "Utils/UI/GlobalStyles";
import {Observer} from "vwebapp-framework";
import {GetNodeL3, GetNodeDisplayText} from "@debate-map/server-link/Source/Link";
import {IsUserCreatorOrMod} from "@debate-map/server-link/Source/Link";
import {MeID} from "@debate-map/server-link/Source/Link";
import {UnlinkNode} from "@debate-map/server-link/Source/Link";
import {MI_SharedProps} from "../NodeUI_Menu";

@Observer
export class MI_UnlinkContainerArgument extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {map, mapID, node, path, holderType, combinedWithParentArg} = this.props;
		if (!combinedWithParentArg) return null;
		const componentBox = holderType != null;
		if (componentBox) return null;

		const argumentPath = SlicePath(path, 1);
		const argument = GetNodeL3(argumentPath);
		const argumentText = GetNodeDisplayText(argument, argumentPath);
		if (!IsUserCreatorOrMod(MeID(), argument)) return null;

		const argumentParentPath = SlicePath(argumentPath, 1);
		const argumentParent = GetNodeL3(argumentParentPath);

		const command = new UnlinkNode({mapID, parentID: argumentParent._key, childID: argument._key});
		return (
			<VMenuItem text="Unlink argument"
				enabled={command.Validate_Safe() == null} title={command.validateError}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;
					ShowMessageBox({
						title: `Unlink "${argumentText}"`, cancelButton: true,
						message: `Unlink the argument "${argumentText}"?`,
						onOK: async()=>{
							command.Run();
						},
					});
				}}/>
		);
	}
}
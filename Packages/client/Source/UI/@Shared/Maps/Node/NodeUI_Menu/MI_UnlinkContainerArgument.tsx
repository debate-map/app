import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {Observer} from "web-vcore";
import {GetNodeL3, GetNodeDisplayText, IsUserCreatorOrMod, MeID, UnlinkNode, ChildGroup} from "dm_common";
import {Assert, NN} from "web-vcore/nm/js-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_UnlinkContainerArgument extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {map, mapID, node, path, childGroup, combinedWithParentArg} = this.props;
		if (!combinedWithParentArg) return null;
		const componentBox = childGroup != ChildGroup.generic;
		if (componentBox) return null;

		const argumentPath = NN(SlicePath(path, 1));
		const argument = GetNodeL3.NN(argumentPath);
		const argumentText = GetNodeDisplayText(argument, argumentPath);
		if (!IsUserCreatorOrMod(MeID(), argument)) return null;

		const argumentParentPath = SlicePath(argumentPath, 1);
		const argumentParent = GetNodeL3(argumentParentPath);
		Assert(argumentParent, "Cannot find parent of specified argument.");

		const command = new UnlinkNode({mapID, parentID: argumentParent.id, childID: argument.id});
		return (
			<VMenuItem text="Unlink argument"
				enabled={command.Validate_Safe() == null} title={command.ValidateErrorStr ?? undefined}
				style={liveSkin.Style_VMenuItem()} onClick={e=>{
					if (e.button != 0) return;
					ShowMessageBox({
						title: `Unlink "${argumentText}"`, cancelButton: true,
						message: `Unlink the argument "${argumentText}"?`,
						onOK: async()=>{
							command.RunOnServer();
						},
					});
				}}/>
		);
	}
}
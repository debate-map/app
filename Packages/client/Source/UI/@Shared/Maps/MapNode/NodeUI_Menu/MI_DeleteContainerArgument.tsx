import {ChildGroup, DeleteArgument, GetNodeChildLinks, GetNodeDisplayText, GetNodeL3, IsUserCreatorOrMod, MeID} from "dm_common";
import {styles} from "Utils/UI/GlobalStyles.js";
import {Observer} from "web-vcore";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_DeleteContainerArgument extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, mapID, node, path, childGroup, combinedWithParentArg} = this.props;
		if (!combinedWithParentArg) return <div/>;
		const componentBox = childGroup != ChildGroup.generic;
		if (componentBox) return <div/>;

		const argumentPath = SlicePath(path, 1);
		const argument = GetNodeL3(argumentPath);
		if (argumentPath == null || argument == null) return null; // wait till loaded
		const argumentText = GetNodeDisplayText(argument, argumentPath);
		// const forDelete_error = ForDelete_GetError(MeID(), argument, { childrenToIgnore: [node.id] });
		if (!IsUserCreatorOrMod(MeID(), argument)) return null;

		const canDeleteBaseClaim = IsUserCreatorOrMod(MeID(), node);
		const claimParentLinks = GetNodeChildLinks(null, node.id);
		const deleteClaim = canDeleteBaseClaim && claimParentLinks.length <= 1;

		const command = new DeleteArgument({mapID, argumentID: argument.id, claimID: node.id, deleteClaim});
		const error = command.Validate_Safe();

		return (
			<VMenuItem text="Delete argument" enabled={error == null} title={error}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;

					ShowMessageBox({
						title: `Delete "${argumentText}"`, cancelButton: true,
						message: `Delete the argument "${argumentText}", and ${deleteClaim ? "delete" : "unlink"} its base-claim?`,
						onOK: async()=>{
							await command.RunOnServer();
						},
					});
				}}/>
		);
	}
}
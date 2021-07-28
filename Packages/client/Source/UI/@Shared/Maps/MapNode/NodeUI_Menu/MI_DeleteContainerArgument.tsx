import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {E} from "web-vcore/nm/js-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {styles} from "Utils/UI/GlobalStyles.js";
import {Observer} from "web-vcore";
import {GetNodeL3, GetNodeDisplayText, GetNodeChildLinks, IsUserCreatorOrMod, MeID, UnlinkNode, DeleteNode, HolderType} from "dm_common";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_DeleteContainerArgument extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, mapID, node, path, holderType, combinedWithParentArg} = this.props;
		if (!combinedWithParentArg) return <div/>;
		const componentBox = holderType != HolderType.generic;
		if (componentBox) return <div/>;

		const argumentPath = SlicePath(path, 1);
		const argument = GetNodeL3(argumentPath);
		if (argumentPath == null || argument == null) return null; // wait till loaded
		const argumentText = GetNodeDisplayText(argument, argumentPath);
		// const forDelete_error = ForDelete_GetError(MeID(), argument, { childrenToIgnore: [node.id] });
		if (!IsUserCreatorOrMod(MeID(), argument)) return null;

		/* const command = new DeleteNode({ mapID, nodeID: node.id, withContainerArgument: argument.id });
		const error = command.Validate_Safe(); */

		const canDeleteBaseClaim = IsUserCreatorOrMod(MeID(), node);
		const parentLinks = GetNodeChildLinks(null, node.id);
		const baseClaimCommand = parentLinks.length > 1 || !canDeleteBaseClaim
			? new UnlinkNode({mapID, parentID: argument.id, childID: node.id})
			: new DeleteNode({mapID, nodeID: node.id});

		const argumentCommand = new DeleteNode(E({mapID, nodeID: argument.id}));
		if (baseClaimCommand) {
			// temp; client isn't supposed to be able to set asSubcommand (we do it for now, since we don't have a dedicated DeleteArgument command created yet)
			argumentCommand.parentCommand = {} as any;
			argumentCommand.childrenToIgnore = [node.id];
		}
		const error = argumentCommand.Validate_Safe() ?? baseClaimCommand?.Validate_Safe();

		return (
			<VMenuItem text="Delete argument" enabled={error == null} title={error}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;

					ShowMessageBox({
						title: `Delete "${argumentText}"`, cancelButton: true,
						message: `Delete the argument "${argumentText}", and ${baseClaimCommand instanceof UnlinkNode ? "unlink" : "delete"} its base-claim?`,
						onOK: async()=>{
							// await command.RunOnServer();
							// if deleting single-premise argument, first delete or unlink the base-claim
							if (baseClaimCommand) {
								await baseClaimCommand.RunOnServer();
							}
							await argumentCommand.RunOnServer();
						},
					});
				}}/>
		);
	}
}
import {SlicePath} from "mobx-firelink";
import {BaseComponent} from "react-vextensions";
import {E} from "js-vextensions";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {styles} from "Source/Utils/UI/GlobalStyles";
import {MI_SharedProps} from "../NodeUI_Menu";
import {Observer} from "vwebapp-framework";
import {GetNodeL3, GetNodeDisplayText} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/$node";
import {IsUserCreatorOrMod} from "Subrepos/Server/Source/@Shared/Store/firebase/users/$user";
import {MeID} from "Subrepos/Server/Source/@Shared/Store/firebase/users";
import {UnlinkNode} from "Subrepos/Server/Source/@Shared/Commands/UnlinkNode";
import {DeleteNode} from "Subrepos/Server/Source/@Shared/Commands/DeleteNode";

@Observer
export class MI_DeleteContainerArgument extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, mapID, node, path, holderType, combinedWithParentArg} = this.props;
		if (!combinedWithParentArg) return <div/>;
		const componentBox = holderType != null;
		if (componentBox) return <div/>;

		const argumentPath = SlicePath(path, 1);
		const argument = GetNodeL3(argumentPath);
		if (argument == null) return null; // wait till loaded
		const argumentText = GetNodeDisplayText(argument, argumentPath);
		// const forDelete_error = ForDelete_GetError(MeID(), argument, { childrenToIgnore: [node._key] });
		if (!IsUserCreatorOrMod(MeID(), argument)) return null;

		/* const command = new DeleteNode({ mapID, nodeID: node._key, withContainerArgument: argument._key });
		const error = command.Validate_Safe(); */

		const canDeleteBaseClaim = IsUserCreatorOrMod(MeID(), node);
		const baseClaimCommand = node.parents.VKeys().length > 1 || !canDeleteBaseClaim
			? new UnlinkNode({mapID, parentID: argument._key, childID: node._key})
			: new DeleteNode({mapID, nodeID: node._key});

		const argumentCommand = new DeleteNode(E({mapID, nodeID: argument._key}));
		if (baseClaimCommand) {
			// temp; client isn't supposed to be able to set asSubcommand (we do it for now, since we don't have a dedicated DeleteArgument command created yet)
			argumentCommand.parentCommand = {} as any;
			argumentCommand.childrenToIgnore = [node._key];
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
							// await command.Run();
							// if deleting single-premise argument, first delete or unlink the base-claim
							if (baseClaimCommand) {
								await baseClaimCommand.Run();
							}
							await argumentCommand.Run();
						},
					});
				}}/>
		);
	}
}


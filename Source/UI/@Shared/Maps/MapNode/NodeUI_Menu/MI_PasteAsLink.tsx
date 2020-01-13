import {BaseComponent} from "react-vextensions";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {GetNodeDisplayText} from "Store/firebase/nodes/$node";
import {MeID} from "Store/firebase/users";
import {styles} from "Utils/UI/GlobalStyles";
import {Observer} from "vwebapp-framework";
import {CanGetBasicPermissions} from "Store/firebase/users/$user";
import {GetParentNodeL3, GetParentNodeID} from "Store/firebase/nodes";
import {MapNodeType} from "Store/firebase/nodes/@MapNodeType";
import {ClaimForm} from "Store/firebase/nodes/@MapNode";
import {LinkNode_HighLevel} from "Server/Commands/LinkNode_HighLevel";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {runInAction} from "mobx";
import {store} from "Store";
import {MI_SharedProps} from "../NodeUI_Menu";

/* let PasteAsLink_MenuItem_connector = (state, {}: SharedProps)=> {
	let moveOpPayload = {};
	let valid = IsUserBasicOrAnon(MeID()) && copiedNode != null && IsMoveNodeOpValid(moveOpPayload);
	return {valid};
};
@Connect(connector)
class PasteAsLink_MenuItem extends BaseComponentWithConnector(PasteAsLink_MenuItem_connector, {}) { */
@Observer
export class MI_PasteAsLink extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path, holderType, copiedNode, copiedNodePath, copiedNode_asCut, combinedWithParentArg, inList} = this.props;
		if (!CanGetBasicPermissions(MeID())) return <div/>;
		if (copiedNode == null) return <div/>;
		if (inList) return <div/>;
		const copiedNode_parent = GetParentNodeL3(copiedNodePath);

		const formForClaimChildren = node.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base;
		const linkCommand = new LinkNode_HighLevel({
			mapID: map._key, oldParentID: GetParentNodeID(copiedNodePath), newParentID: node._key, nodeID: copiedNode._key,
			newForm: copiedNode.type == MapNodeType.Claim ? formForClaimChildren : null,
			newPolarity:
				(copiedNode.type == MapNodeType.Argument ? copiedNode.link.polarity : null) // if node itself has polarity, use it
				|| (copiedNode_parent && copiedNode_parent.type == MapNodeType.Argument ? copiedNode_parent.link.polarity : null), // else if our parent has a polarity, use that
			allowCreateWrapperArg: holderType != null || !node.multiPremiseArgument,
			unlinkFromOldParent: copiedNode_asCut, deleteOrphanedArgumentWrapper: true,
		});
		const error = linkCommand.Validate_Safe();

		return (
			<VMenuItem text={`Paste${copiedNode_asCut ? "" : " as link"}: "${GetNodeDisplayText(copiedNode, null, formForClaimChildren).KeepAtMost(50)}"`}
				enabled={error == null} title={error}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					if (copiedNode.type == MapNodeType.Argument && !copiedNode_asCut) {
						// eslint-disable-next-line
						return void ShowMessageBox({
							title: "Argument at two locations?", cancelButton: true, onOK: proceed,
							message: `
								Are you sure you want to paste this argument as a linked child?

								Only do this if you're sure that the impact-premise applies exactly the same to both the old parent and the new parent. (usually it does not, ie. usually it's specific to its original parent claim)

								If not, paste the argument as a clone instead.
							`.AsMultiline(0),
						});
					}
					proceed();

					async function proceed() {
						const {argumentWrapperID} = await linkCommand.Run();
						if (argumentWrapperID) {
							runInAction("PasteAsLink_MenuItem.proceed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentWrapperID, Date.now()));
						}
					}
				}}/>
		);
	}
}
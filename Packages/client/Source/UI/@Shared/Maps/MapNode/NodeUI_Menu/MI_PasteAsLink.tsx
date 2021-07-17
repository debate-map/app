import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {styles} from "Utils/UI/GlobalStyles.js";
import {Observer} from "web-vcore";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {store} from "Store";
import {GetParentNodeL3, GetParentNodeID, Polarity, MapNodeType, ClaimForm, GetNodeContributionInfo, GetPolarityShortStr, NodeContributionInfo_ForPolarity, ReversePolarity, GetNodeDisplayText, MeID, LinkNode_HighLevel} from "dm_common";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_PasteAsLink extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path, holderType, copiedNode, copiedNodePath, copiedNode_asCut, combinedWithParentArg, inList} = this.props;
		if (copiedNode == null) return null;
		if (inList) return null;
		const copiedNode_parent = GetParentNodeL3(copiedNodePath);
		const formForClaimChildren = node.type == MapNodeType.category ? ClaimForm.yesNoQuestion : ClaimForm.base;
		let newPolarity =
			(copiedNode.type == MapNodeType.argument ? copiedNode.link?.polarity : null) // if node itself has polarity, use it
			|| (copiedNode_parent?.type == MapNodeType.argument ? copiedNode_parent.link?.polarity : null); // else if our parent has a polarity, use that

		const contributeInfo = GetNodeContributionInfo(node.id);
		let contributeInfo_polarity: NodeContributionInfo_ForPolarity|n;
		if (newPolarity) {
			contributeInfo_polarity = contributeInfo[`${GetPolarityShortStr(newPolarity)}Args`] as NodeContributionInfo_ForPolarity;
			// if can't add with source polarity, try adding with reversed polarity
			if (!contributeInfo_polarity.canAdd) {
				newPolarity = ReversePolarity(newPolarity);
				contributeInfo_polarity = contributeInfo[`${GetPolarityShortStr(newPolarity)}Args`] as NodeContributionInfo_ForPolarity;
			}
		}

		const linkCommand = new LinkNode_HighLevel({
			mapID: map?.id, oldParentID: GetParentNodeID(copiedNodePath), newParentID: contributeInfo_polarity?.hostNodeID ?? node.id, nodeID: copiedNode.id,
			newForm: copiedNode.type == MapNodeType.claim ? formForClaimChildren : null,
			newPolarity: contributeInfo_polarity?.reversePolarities ? ReversePolarity(newPolarity!) : newPolarity,
			createWrapperArg: holderType != null || !node.multiPremiseArgument,
			unlinkFromOldParent: copiedNode_asCut, deleteEmptyArgumentWrapper: true,
		});
		const error = linkCommand.Validate_Safe();

		return (
			<VMenuItem text={`Paste${copiedNode_asCut ? "" : " as link"}: "${GetNodeDisplayText(copiedNode, undefined, formForClaimChildren).KeepAtMost(50)}"`}
				enabled={error == null} title={error}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					if (copiedNode.type == MapNodeType.argument && !copiedNode_asCut) {
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
						const {argumentWrapperID} = await linkCommand.RunOnServer();
						if (argumentWrapperID) {
							runInAction("PasteAsLink_MenuItem.proceed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentWrapperID, Date.now()));
						}
					}
				}}/>
		);
	}
}
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {VMenuItem} from "web-vcore/nm/react-vmenu";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {styles} from "Utils/UI/GlobalStyles";
import {Observer} from "web-vcore";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {runInAction} from "web-vcore/nm/mobx";
import {store} from "Store";
import {GetParentNodeL3, GetParentNodeID} from "dm_common";
import {MapNodeType} from "dm_common";
import {ClaimForm} from "dm_common";
import {GetNodeContributionInfo, GetPolarityShortStr, NodeContributionInfo_ForPolarity, ReversePolarity, GetNodeDisplayText} from "dm_common";
import {MeID} from "dm_common";
import {LinkNode_HighLevel} from "dm_common";
import {MI_SharedProps} from "../NodeUI_Menu";

@Observer
export class MI_PasteAsLink extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path, holderType, copiedNode, copiedNodePath, copiedNode_asCut, combinedWithParentArg, inList} = this.props;
		if (copiedNode == null) return null;
		if (inList) return null;
		const copiedNode_parent = GetParentNodeL3(copiedNodePath);
		const formForClaimChildren = node.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base;
		let newPolarity =
			(copiedNode.type == MapNodeType.Argument ? copiedNode.link.polarity : null) // if node itself has polarity, use it
			|| (copiedNode_parent && copiedNode_parent.type == MapNodeType.Argument ? copiedNode_parent.link.polarity : null); // else if our parent has a polarity, use that

		const contributeInfo = GetNodeContributionInfo(node.id, MeID());
		let contributeInfo_polarity = contributeInfo[`${GetPolarityShortStr(newPolarity)}Args`] as NodeContributionInfo_ForPolarity;
		// if can't add with source polarity, try adding with reversed polarity
		if (!contributeInfo_polarity.canAdd) {
			newPolarity = ReversePolarity(newPolarity);
			contributeInfo_polarity = contributeInfo[`${GetPolarityShortStr(newPolarity)}Args`] as NodeContributionInfo_ForPolarity;
		}

		const linkCommand = new LinkNode_HighLevel({
			mapID: map.id, oldParentID: GetParentNodeID(copiedNodePath), newParentID: contributeInfo_polarity.hostNodeID, nodeID: copiedNode.id,
			newForm: copiedNode.type == MapNodeType.Claim ? formForClaimChildren : null,
			newPolarity: contributeInfo_polarity.reversePolarities ? ReversePolarity(newPolarity) : newPolarity,
			allowCreateWrapperArg: holderType != null || !node.multiPremiseArgument,
			unlinkFromOldParent: copiedNode_asCut, deleteEmptyArgumentWrapper: true,
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
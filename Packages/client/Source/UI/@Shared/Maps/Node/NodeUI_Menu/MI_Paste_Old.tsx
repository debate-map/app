import {store} from "Store";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {RunCommand_LinkNode} from "Utils/DB/Command.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {CheckNewChildConfigUnderParentIsValid, ClaimForm, GetDisplayTextForNewChildConfig, GetNodeContributionInfo, GetParentNodeID, GetPolarityShortStr, Me, MeID, NewChildConfig, NodeContributionInfo_ForPolarity, NodeType, ReversePolarity} from "dm_common";
import {RunInAction} from "web-vcore";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

type MI_Paste_Old_Props = {
	config: NewChildConfig,
} & MI_SharedProps;

export const MI_Paste_Old = observer_mgl((props: MI_Paste_Old_Props)=>{
	const {map, node, config, copiedNode, copiedNodePath, copiedNode_asCut} = props;
	if (copiedNode == null) return null;
	if (map == null) return null;
	const formForClaimChildren = node.type == NodeType.category ? ClaimForm.question : ClaimForm.base;

	const contributeInfo = GetNodeContributionInfo(node.id);
	let contributeInfo_polarity: NodeContributionInfo_ForPolarity|n;
	if (config.polarity) {
		contributeInfo_polarity = contributeInfo[`${GetPolarityShortStr(config.polarity)}Args`] as NodeContributionInfo_ForPolarity;
		// if can't add with source polarity, this paste is invalid
		if (!contributeInfo_polarity.canAdd) return null;
	}

	// use memo, so we don't keep recreating command each render (since that causes new id's to be generated, causing new db-requests, making cycle keep repeating)
	/*const linkCommand = UseMemo(()=>new LinkNode_HighLevel({
		mapID: map?.id, oldParentID: GetParentNodeID(copiedNodePath), newParentID: contributeInfo_polarity?.hostNodeID ?? node.id, nodeID: copiedNode.id,
		newForm: copiedNode.type == NodeType.claim ? formForClaimChildren : null,
		newPolarity: contributeInfo_polarity?.reversePolarities ? ReversePolarity(newPolarity!) : newPolarity,
		//createWrapperArg: childGroup != ChildGroup.generic || !node.multiPremiseArgument,
		childGroup,
		unlinkFromOldParent: copiedNode_asCut, deleteEmptyArgumentWrapper: true,
	}.OmitNull()), [childGroup, contributeInfo_polarity?.hostNodeID, contributeInfo_polarity?.reversePolarities, copiedNode.id, copiedNode.type, copiedNodePath, copiedNode_asCut, formForClaimChildren, map?.id, newPolarity, node.id]);
	const error = linkCommand.Validate_Safe();*/
	const newParentID = contributeInfo_polarity?.hostNodeID ?? node.id;

	//const wrapperArgNeeded = IsWrapperArgNeededForTransfer(newParent.type, config.childGroup, copiedNode.type);
	const error = CheckNewChildConfigUnderParentIsValid(config, newParentID, Me());
	if (config.addWrapperArg) {
		//error ||= CheckNewLinkIsValid("<some new node id>", copiedNode, ChildGroup.generic, null, Me());
	}

	const text = GetDisplayTextForNewChildConfig(node, config, true, {copiedNode_asCut});

	return (
		<VMenuItem text={text} enabled={error == null} title={error} style={liveSkin.Style_VMenuItem()} onClick={e=>{
			if (e.button != 0) return;
			if (MeID() == null) return ShowSignInPopup();

			if (copiedNode.type == NodeType.argument && !copiedNode_asCut) {
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
				//const {argumentWrapperID} = await linkCommand.RunOnServer();
				const {argumentWrapperID} = await RunCommand_LinkNode({
					mapID: map?.id, oldParentID: GetParentNodeID(copiedNodePath), newParentID: contributeInfo_polarity?.hostNodeID ?? node.id, nodeID: copiedNode!.id,
					newForm: copiedNode!.type == NodeType.claim ? formForClaimChildren : null,
					newPolarity: contributeInfo_polarity?.reversePolarities ? ReversePolarity(config.polarity!) : config.polarity,
					//createWrapperArg: childGroup != ChildGroup.generic || !node.multiPremiseArgument,
					childGroup: config.childGroup,
					unlinkFromOldParent: copiedNode_asCut, deleteEmptyArgumentWrapper: true,
				});
				if (argumentWrapperID) {
					RunInAction("PasteAsLink_MenuItem.proceed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentWrapperID, Date.now()));
				}
			}
		}}/>
	);
});

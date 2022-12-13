import {ClaimForm, GetNodeDisplayText, NodeType, MeID, TransferType} from "dm_common";
import React from "react";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {Observer} from "web-vcore";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {ShowTransferNodeDialog} from "./Dialogs/TransferNodeDialog.js";
import {GetTransferNodesInitialData} from "./Dialogs/TransferNodeDialog/TransferNodeData.js";

// todo: have this menu-item fully replace MI_Paste_Old

@Observer
export class MI_Paste extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path, childGroup, copiedNode, copiedNodePath, copiedNode_asCut, combinedWithParentArg, inList} = this.props;
		if (copiedNode == null || copiedNodePath == null) return null;
		if (inList) return null;

		const formForClaimChildren = node.type == NodeType.category ? ClaimForm.question : ClaimForm.base;

		const [commandData_initial, uiState_initial] = GetTransferNodesInitialData(map, copiedNode, copiedNodePath, node, childGroup, copiedNode_asCut ? TransferType.move : TransferType.link);
		if (commandData_initial == null || uiState_initial == null) return;

		return (
			<VMenuItem text={`Paste: "${GetNodeDisplayText(copiedNode, undefined, formForClaimChildren).KeepAtMost(50)}"`}
				style={liveSkin.Style_VMenuItem()} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					ShowTransferNodeDialog(commandData_initial, uiState_initial);
				}}/>
		);
	}
}

// old code
// ==========

// const copiedNode_parent = GetParentNodeL3(copiedNodePath);
// const formForClaimChildren = node.type == NodeType.category ? ClaimForm.question : ClaimForm.base;
// let newPolarity =
// 	(copiedNode.type == NodeType.argument ? copiedNode.link?.polarity : null) // if node itself has polarity, use it
// 	|| (copiedNode_parent?.type == NodeType.argument ? copiedNode_parent.link?.polarity : null); // else if our parent has a polarity, use that

// const contributeInfo = GetNodeContributionInfo(node.id);
// let contributeInfo_polarity: NodeContributionInfo_ForPolarity|n;
// if (newPolarity) {
// 	contributeInfo_polarity = contributeInfo[`${GetPolarityShortStr(newPolarity)}Args`] as NodeContributionInfo_ForPolarity;
// 	// if can't add with source polarity, try adding with reversed polarity
// 	if (!contributeInfo_polarity.canAdd) {
// 		newPolarity = ReversePolarity(newPolarity);
// 		contributeInfo_polarity = contributeInfo[`${GetPolarityShortStr(newPolarity)}Args`] as NodeContributionInfo_ForPolarity;
// 	}
// }

// // use memo, so we don't keep recreating command each render (since that causes new id's to be generated, causing new db-requests, making cycle keep repeating)
// const linkCommand = UseMemo(()=>new LinkNode_HighLevel({
// 	mapID: map?.id, oldParentID: GetParentNodeID(copiedNodePath), newParentID: contributeInfo_polarity?.hostNodeID ?? node.id, nodeID: copiedNode.id,
// 	newForm: copiedNode.type == NodeType.claim ? formForClaimChildren : null,
// 	newPolarity: contributeInfo_polarity?.reversePolarities ? ReversePolarity(newPolarity!) : newPolarity,
// 	//createWrapperArg: childGroup != ChildGroup.generic || !node.multiPremiseArgument,
// 	childGroup,
// 	unlinkFromOldParent: copiedNode_asCut, deleteEmptyArgumentWrapper: true,
// }.OmitNull()), [childGroup, contributeInfo_polarity?.hostNodeID, contributeInfo_polarity?.reversePolarities, copiedNode.id, copiedNode.type, copiedNodePath, copiedNode_asCut, formForClaimChildren, map?.id, newPolarity, node.id]);
// const error = linkCommand.Validate_Safe();

// // todo

// try {
// 	const tempCommand = helper.GetCommand();
// 	boxController.options.okButtonProps = {
// 		enabled: tempCommand.Validate_Safe() == null,
// 		title: tempCommand.ValidateErrorStr as any,
// 	};
// } catch (ex) {
// 	if (ex instanceof BailError) {
// 		boxController.options.okButtonProps = {
// 			enabled: false,
// 			title: ex.message,
// 		};
// 		return <div>Loading...</div>;
// 	}
// 	throw ex;
// }

// const accessPolicy = GetAccessPolicy.CatchBail(null, helper.node.accessPolicy);
// if (accessPolicy == null) return null as any as JSX.Element; // wait
// //Object.defineProperty(helper.node, "policy", {configurable: true, set: val=>{ debugger; }});
// const newNodeAsL2 = AsNodeL2(helper.node, helper.node_revision, accessPolicy);
// const newNodeAsL3 = AsNodeL3(newNodeAsL2, helper.node_link, childPolarity);

// const advanced = store.main.maps.addChildDialog.advanced;
// return (
// 	<Column ref={c=>root = c} style={{width: 600}}>
// 		{childType == NodeType.argument && // right now, the "advanced" UI is only different when adding an argument, so only let user see/set it in that case
// 		<Row center mb={5}>
// 			{childType == NodeType.argument && advanced &&
// 			<>
// 				<Text>Data:</Text>
// 				<Select ml={5} displayType="button bar" options={GetEntries(AddChildDialogTab, "ui")} style={{display: "inline-block"}}
// 					value={tab} onChange={val=>Change(tab = val)}/>
// 				<InfoButton ml={5} mr={5} text={`
// 					An "argument" consists of two parts: 1) the argument node itself, 2) the argument's premise/claim node(s)

// 					Use the tabs to control which part you're setting the data for.
// 				`.AsMultiline(0)}/>
// 			</>}
// 			<CheckBox text="Advanced" value={advanced} onChange={val=>{
// 				RunInAction("AddChildDialog.advanced.onChange", ()=>store.main.maps.addChildDialog.advanced = val);
// 				if (!val) tab = AddChildDialogTab.Claim;
// 				Change();
// 			}}/>
// 		</Row>}
// 		{tab == AddChildDialogTab.Argument &&
// 		<>
// 			<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: 0}} parent={prep.parentNode}
// 				baseData={newNodeAsL3} baseRevisionData={helper.node_revision} baseLinkData={helper.node_link} forNew={true}
// 				onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
// 					/*if (map?.requireMapEditorsCanEdit) {
// 						comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.mapEditors};
// 					}*/
// 					helper.VSet({node: newNodeData, node_revision: newRevisionData, node_link: newLinkData});
// 					Change();
// 				}}/>
// 		</>}
// 		{tab == AddChildDialogTab.Claim &&
// 		<>
// 			{childType == NodeType.argument &&
// 			<>
// 				{!advanced &&
// 				<Column>
// 					<Row style={{display: "flex", alignItems: "center"}}>
// 						<Pre>Main claim (ie. premise) that your argument will be based on: </Pre>
// 						<Link to="https://en.wikipedia.org/wiki/Premise" style={{marginLeft: "auto", fontSize: 12, opacity: 0.7}}>What is a premise?</Link>
// 						{/* <InfoButton text={`
// 						`.trim()}/> */}
// 					</Row>
// 					<Row style={{display: "flex", alignItems: "center"}}>
// 						<TextArea required={true} pattern={NodeRevision_titlePattern}
// 							allowLineBreaks={false} autoSize={true} style={ES({flex: 1})}
// 							value={helper.subNode_revision!.phrasing["text_base"]}
// 							onChange={val=>Change(helper.subNode_revision!.phrasing["text_base"] = val)}/>
// 					</Row>
// 					<Row mt={5} style={{fontSize: 12}}>{`To add a second premise later, right click on your new argument and press "Convert to multi-premise".`}</Row>
// 				</Column>}
// 				{advanced &&
// 				<NodeDetailsUI style={{padding: "5px 0 0 0"}} parent={newNodeAsL3}
// 					baseData={helper.subNode!} baseRevisionData={helper.subNode_revision!} baseLinkData={helper.subNode_link} forNew={true}
// 					onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
// 						/*if (map?.requireMapEditorsCanEdit) {
// 							comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.mapEditors};
// 						}*/
// 						helper.VSet({subNode: newNodeData, subNode_revision: newRevisionData, subNode_link: newLinkData});
// 						Change();
// 					}}/>}
// 			</>}
// 			{childType != NodeType.argument &&
// 			<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: childType == NodeType.claim ? "5px 0 0 0" : 0}} parent={prep.parentNode}
// 				baseData={newNodeAsL3} baseRevisionData={helper.node_revision} baseLinkData={helper.node_link} forNew={true}
// 				onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
// 					/*if (map?.requireMapEditorsCanEdit) {
// 						comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.mapEditors};
// 					}*/
// 					helper.VSet({node: newNodeData, node_revision: newRevisionData, node_link: newLinkData});
// 					Change();
// 				}}/>}
// 		</>}
// 	</Column>
// );
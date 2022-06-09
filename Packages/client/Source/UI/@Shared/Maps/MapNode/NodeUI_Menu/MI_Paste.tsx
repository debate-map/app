import {AsNodeL2, AsNodeL3, ChildGroup, ClaimForm, GetAccessPolicy, GetMapNodeTypeDisplayName, GetNode, GetNodeContributionInfo, GetNodeDisplayText, GetNodeForm, GetNodeL3, GetParentNodeID, GetParentNodeL3, GetPolarityShortStr, LinkNode_HighLevel, MapNodeL3, MapNodeRevision_titlePattern, MapNodeType, MeID, NodeContributionInfo_ForPolarity, Polarity, ReversePolarity} from "dm_common";
import React from "react";
import {store} from "Store";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import map from "updeep/types/map";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {ES, InfoButton, Link, Observer, RunInAction} from "web-vcore";
import {GetEntries, GetValues, ModifyString} from "web-vcore/nm/js-vextensions.js";
import {BailError, Command, GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import {observer} from "web-vcore/nm/mobx-react.js";
import {CheckBox, Column, Pre, Row, Select, Text, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, UseMemo} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {NodeDetailsUI} from "../NodeDetailsUI.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {AddChildHelper} from "./Dialogs/AddChildDialog.js";

@Observer
export class MI_Paste extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path, childGroup, copiedNode, copiedNodePath, copiedNode_asCut, combinedWithParentArg, inList} = this.props;
		if (copiedNode == null || copiedNodePath == null) return null;
		if (inList) return null;

		const formForClaimChildren = node.type == MapNodeType.category ? ClaimForm.question : ClaimForm.base;

		const oldParentID = GetParentNodeID(copiedNodePath);
		const commandData_initial: PayloadOf<LinkNode_HighLevel> = {
			mapID: map?.id, oldParentID, newParentID: node.id, nodeID: copiedNode.id,
			newForm: null, newPolarity: null,
			//createWrapperArg?: boolean,
			childGroup,
			//linkAsArgument?: boolean,
			unlinkFromOldParent: copiedNode_asCut,
			deleteEmptyArgumentWrapper: false,
		};

		return (
			<VMenuItem text={`Paste: "${GetNodeDisplayText(copiedNode, undefined, formForClaimChildren).KeepAtMost(50)}"`}
				style={liveSkin.Style_VMenuItem()} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					ShowPasteDialog(commandData_initial);
				}}/>
		);
	}
}

export type PayloadOf<T> = T extends Command<infer Payload> ? Payload : never;

export class TransferType {
	name: string;
	steps: {text: string, extra: string}[];
}
export const transferTypes: TransferType[] = [
	{name: "Cut", steps: [
		{text: `Source-node is linked under new location.`, extra: ""},
		{text: `Source-node is unlinked from old location.`, extra: ""},
	]},
	{name: "Copy", steps: [
		{text: `Source-node is linked under new location.`, extra: ""},
	]},
	{name: "Clone", steps: [
		{text: `A "clone" of the source-node is created.`, extra: ""},
		{text: `That "clone" is linked under new location.`, extra: ""},
	]},
];
export async function ShowPasteDialog(commandData_initial: PayloadOf<LinkNode_HighLevel>) {
	const commandData = commandData_initial;
	const uiState = {};

	let root;
	//let nodeEditorUI: NodeDetailsUI|n;
	const Change = (..._)=>boxController.UpdateUI();

	const boxController = ShowMessageBox({
		title: `Pasting node to new location`, cancelButton: true,
		message: observer(()=>{
			const sourceNodeOptions = [
				GetNodeL3(`${commandData_initial.oldParentID}/${commandData_initial.nodeID}`),
			].filter(a=>a);
			const destinationNodeOptions = [
				GetNodeL3(`${commandData_initial.newParentID}`),
			].filter(a=>a);
			const validDestinationGroups = GetEntries(ChildGroup);
			const transferType = transferTypes[2];

			return (
				<Row ref={c=>root = c} style={{width: 1000}}>
					<Column style={{flex: 1}}>
						<Row>Source node:</Row>
						<Column style={{background: "rgba(0,0,0,.1)", padding: 5, borderRadius: 5}}>
							{sourceNodeOptions.map((source, index)=>{
								return (
									<NodePreviewUI key={index} panel="source" node={source!} index={index}/>
								);
							})}
						</Column>
						<Text>Transfer type:</Text>
						<Column>
							{transferTypes.map((type, index)=>{
								return <TransferTypeButton key={index} type={type} index={index} selected={transferType == type}/>;
							})}
						</Column>
						{transferType == transferTypes[2] &&
						<>
							<Row>Clone options:</Row>
							<Column style={{background: "rgba(0,0,0,.1)", padding: 5, borderRadius: 5}}>
								<Row>
									<Text>Node-type of clone:</Text>
									<Select ml={5} options={GetEntries(MapNodeType)} value={MapNodeType.category}/>
								</Row>
							</Column>
						</>}
						{/*<Row>
							<CheckBox text="Use wrapper/argument as source" value={!!commandData.unlinkFromOldParent} onChange={val=>Change(commandData.unlinkFromOldParent = val)}/>
						</Row>*/}
					</Column>
					<Column ml={10} style={{flex: 1}}>
						<Row>Destination node (new parent):</Row>
						<Column style={{background: "rgba(0,0,0,.1)", padding: 5, borderRadius: 5}}>
							{destinationNodeOptions.map((node, index)=>{
								return (
									<NodePreviewUI key={index} panel="destination" node={node!} index={index}/>
								);
							})}
						</Column>
						<Row>
							<Text>Destination group:</Text>
							<Select ml={5} options={validDestinationGroups} value={ChildGroup.generic}
								onChange={val=>{
									Change(commandData.childGroup = val);
									// todo
								}}/>
						</Row>
					</Column>
				</Row>
			);
		}),
		onOK: ()=>{
			// todo
		},
	});
}

class TransferTypeButton extends BaseComponent<{type: TransferType, index: number, selected: boolean}, {}> {
	render() {
		const {type, index, selected} = this.props;
		return (
			<Column mt={index === 0 ? 0 : 5} style={ES(
				{background: `rgba(0,0,0,${selected ? .2 : .1})`, padding: 5, borderRadius: 5, cursor: "pointer"},
				selected && {border: "2px solid rgba(0,0,0,.3)"},
			)}>
				<Text ml={5} style={{fontSize: 18}}>{type.name}</Text>
				{type.steps.map((step, stepI)=>{
					return <Row key={stepI}>
						<Text>Step {stepI + 1}: {step.text}</Text>
						{step.extra.length > 0 && <InfoButton text={step.extra}/>}
					</Row>;
				})}
			</Column>
		);
	}
}

class NodePreviewUI extends BaseComponent<{panel: "source" | "destination", node: MapNodeL3, index: number}, {}> {
	render() {
		const {panel, node, index} = this.props;
		const path = node.link ? `${node.link?.parent}/${node.link?.child}` : node.id;

		const backgroundColor = GetNodeColor(node).desaturate(0.5).alpha(0.8);
		return (
			<Row mt={index === 0 ? 0 : 5} style={{flex: 1}}>
				<CheckBox value={true} text={`${ModifyString(MapNodeType[node.type], m=>[m.startLower_to_upper])}:`}/>
				<Row ml={10} className="cursorSet"
					style={ES(
						{
							flex: 1, padding: 5,
							background: backgroundColor.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)",
							color: liveSkin.NodeTextColor(),
						},
						// selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
					)}
					onMouseDown={e=>{
						if (e.button !== 2) return false;
						this.SetState({menuOpened: true});
					}}>
					<span style={{flex: 1}}>{GetNodeDisplayText(node, path)}</span>
				</Row>
			</Row>
		);
	}
}

// old code
// ==========

// const copiedNode_parent = GetParentNodeL3(copiedNodePath);
// const formForClaimChildren = node.type == MapNodeType.category ? ClaimForm.question : ClaimForm.base;
// let newPolarity =
// 	(copiedNode.type == MapNodeType.argument ? copiedNode.link?.polarity : null) // if node itself has polarity, use it
// 	|| (copiedNode_parent?.type == MapNodeType.argument ? copiedNode_parent.link?.polarity : null); // else if our parent has a polarity, use that

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
// 	newForm: copiedNode.type == MapNodeType.claim ? formForClaimChildren : null,
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
// 		{childType == MapNodeType.argument && // right now, the "advanced" UI is only different when adding an argument, so only let user see/set it in that case
// 		<Row center mb={5}>
// 			{childType == MapNodeType.argument && advanced &&
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
// 			{childType == MapNodeType.argument &&
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
// 						<TextArea required={true} pattern={MapNodeRevision_titlePattern}
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
// 			{childType != MapNodeType.argument &&
// 			<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: childType == MapNodeType.claim ? "5px 0 0 0" : 0}} parent={prep.parentNode}
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
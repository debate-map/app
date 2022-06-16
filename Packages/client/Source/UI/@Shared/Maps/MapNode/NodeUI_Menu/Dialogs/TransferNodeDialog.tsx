import {ChildGroup, ClaimForm, GetNode, GetNodeChildrenL3, GetNodeDisplayText, GetNodeL3, IsWrapperArgNeededForTransfer, LinkNode_HighLevel, MapNodeL3, MapNodeType, Polarity} from "dm_common";
import React from "react";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {ES, InfoButton, Observer} from "web-vcore";
import {gql} from "web-vcore/nm/@apollo/client";
import {Clone, GetEntries, ModifyString} from "web-vcore/nm/js-vextensions.js";
import {Command} from "web-vcore/nm/mobx-graphlink.js";
import {observer} from "web-vcore/nm/mobx-react.js";
import {CheckBox, Column, Row, RowLR, Select, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {TransferNodesPayload, TransferNodesUIState, NodeInfoForTransfer, TransferType_values} from "./TransferNodeDialog/TransferNodeData";

export type TransferNodeDialog_SharedProps = {
	payload: TransferNodesPayload,
	uiState: TransferNodesUIState,
	Change: Function,
};

export async function ShowTransferNodeDialog(payload_initial: TransferNodesPayload, uiState_initial: TransferNodesUIState, titleOverride?: string) {
	let payload = payload_initial;
	let uiState = uiState_initial;

	// temp; only allow one transfer at a time
	if (payload.nodes.length > 1) {
		payload.nodes.slice(0, -1).forEach(a=>a.transferType = "ignore");
	}

	let root;
	//let nodeEditorUI: NodeDetailsUI|n;
	const Change = (..._)=>{
		// maybe temp; clone payload and such each time, so components know to rerender
		payload = Clone(payload);
		uiState = Clone(uiState);
		sharedProps = {payload, uiState, Change};
		boxController.UpdateUI();
	};

	let sharedProps: TransferNodeDialog_SharedProps = {payload, uiState, Change};

	const boxController = ShowMessageBox({
		title: titleOverride ?? `Pasting node to new location`, cancelButton: true,
		message: observer(()=>{
			return (
				<Column ref={c=>root = c} style={{width: 1000}}>
					{// temp
					payload.nodes.length > 1 &&
					<Row mb={5}>{`
						Note: For now, this dialog only allows transfer of one node at a time. For cases where an argument and claim are combined into one node-box on the map (such as this case), ${""
						}you'll generally want to choose "move", "link", or "clone" for the claim node (in box #2 below), and "shim" for the argument node (in box #1 below).
					`.AsMultiline(0)}</Row>}

					{payload.nodes.map((nodeInfo, index)=>{
						return <TransferNodeUI key={index} {...sharedProps} nodeInfo={nodeInfo} index={index}/>;
					})}
					{/*<CheckBox text="Preview steps that will be taken" value={true}/>
					<Row>Step 1: todo</Row>
					<Row>Step 2: todo</Row>
					<Row>Step 3: todo</Row>*/}
				</Column>
			);
		}),
		onOK: async()=>{
			const result = await apolloClient.mutate({
				mutation: gql`
					mutation(payload: JSON!) {
						transferNodes(payload: $payload) {
							message
						}
					}
				`,
				variables: {
					payload: {
						// todo
					},
				},
				//fetchPolicy: "network-only",
			});
			console.log("Got result:", result);
		},
	});
}

class InfoRect extends BaseComponent<{text: string, first?: boolean}, {}> {
	render() {
		const {text, first} = this.props;
		return (
			<Row ml={first ? 0 : 5} sel style={{background: "rgba(0,0,0,.1)", padding: 3, borderRadius: 3}}>
				{text}
			</Row>
		);
	}
}

function GetTransferNodeFinalType(nodeInfo: NodeInfoForTransfer) {
	const path = nodeInfo.oldParentID ? `${nodeInfo.oldParentID}/${nodeInfo.nodeID}` : nodeInfo.nodeID;
	const node = GetNodeL3(path);
	if (node == null) return null;
	return nodeInfo.transferType == "clone" && nodeInfo.clone_newType != null ? nodeInfo.clone_newType : node.type;
}
function TransferNodeNeedsWrapper(nodeInfo: NodeInfoForTransfer, uiState: TransferNodesUIState) {
	const finalType = GetTransferNodeFinalType(nodeInfo);
	if (finalType == null) return false;

	return nodeInfo.transferType != "ignore" && IsWrapperArgNeededForTransfer(uiState.destinationParent.type, uiState.destinationChildGroup, finalType, nodeInfo.childGroup);
}

@Observer
class TransferNodeUI extends BaseComponent<TransferNodeDialog_SharedProps & {nodeInfo: NodeInfoForTransfer, index: number}, {}> {
	render() {
		const {payload, uiState, Change, nodeInfo, index} = this.props;

		const earlierNodeInfos = payload.nodes.slice(0, index);
		const earlierNodeInfo_transferring = earlierNodeInfos.find(a=>a.transferType != "ignore");
		let newParent: MapNodeL3|n;
		if (earlierNodeInfo_transferring?.transferType == "shim") newParent = null;
		else if (earlierNodeInfo_transferring != null) newParent = GetNodeL3(`${earlierNodeInfo_transferring.nodeID}`);
		else newParent = uiState.destinationParent;

		const path = nodeInfo.oldParentID ? `${nodeInfo.oldParentID}/${nodeInfo.nodeID}` : nodeInfo.nodeID;
		const node = GetNodeL3(path);
		if (node == null) return;

		const nodeTypeEntries = GetEntries(MapNodeType, "ui");
		const nodeTypeEntry_orig = nodeTypeEntries.find(a=>a.value == node.type)!;
		nodeTypeEntries.Move(nodeTypeEntry_orig, 0);
		nodeTypeEntry_orig.name = `Keep original type (${nodeTypeEntry_orig.name})`;

		const finalType = GetTransferNodeFinalType(nodeInfo);

		//const wrapperSection = nodeInfo.transferType != "ignore" && IsWrapperArgNeededForTransfer(finalType, nodeInfo.childGroup);

		const transferTypeOptions = TransferType_values.map(a=>({name: ModifyString(a, m=>[m.startLower_to_upper]), value: a}));
		const isArgumentForCombined = index == 0 && payload.nodes.length > 1;
		const canBeShim = isArgumentForCombined && TransferNodeNeedsWrapper(payload.nodes[1], uiState);
		if (!canBeShim) transferTypeOptions.Remove(transferTypeOptions.find(a=>a.value == "shim"));

		const splitAt = 110;
		return <>
			{/*wrapperSection &&
			<>
				<Row mt={index === 0 ? 0 : 5} style={{fontSize: 16, fontWeight: "bold"}}>Extra wrapper-argument (for transfer #2)</Row>
				<Column style={{background: "rgba(0,0,0,.1)", padding: 5, borderRadius: 5}}>
					<RowLR mt={5} splitAt={splitAt}>
						<Row>
							<Text>Wrapper:</Text>
							<InfoButton ml={5} mt={3} text={`
								The source-node is set to be of type "claim" after transfer, but the destination child-group doesn't accept "bare" claim children.
								Thus, an empty argument node will be created under the listed "New parent" node, then the transferred node will be placed under that.
							`.AsMultiline(0)}/>
						</Row>
						<Text>{`(destination child-group doesn't accept bare claims, so an empty argument node will be created under "New parent" to hold the transferred claim)`}</Text>
					</RowLR>
				</Column>
			</>*/}

			<Row mt={index === 0 /*&& !wrapperSection*/ ? 0 : 5} style={{fontSize: 16, fontWeight: "bold"}}>Transfer #{index + 1}</Row>
			<Column style={{background: "rgba(0,0,0,.1)", padding: 5, borderRadius: 5}}>
				<RowLR splitAt={splitAt}>
					<Text>Source node:</Text>
					{nodeInfo.transferType != "shim" && <NodePreviewUI key={index} panel="source" node={node!} index={0}/>}
					{nodeInfo.transferType == "shim" &&
					<Text>{`(source-node not relevant, since "shim" is selected; ie. an empty argument node will be created to hold the claim node in box #2)`}</Text>}
				</RowLR>
				<RowLR splitAt={splitAt} mt={5}>
					<Row>
						<Text>Transfer:</Text>
						<InfoButton ml={5} mt={3} text={`
							Ignore: Leave this node at its original location, without moving, linking, or cloning it. (caveat: if this is the "Transfer #2" box, and the "Transfer #1" box is set to "Clone",
								this 2nd transfer's source node may still get linked into the destination location by means of the "Keep children" setting of the 1st transfer)
							Move (aka "Cut then paste"): Unlink the source-node from its existing location, and link it instead under the listed "New parent" node.
							Link (aka "Copy then paste"): Link the source-node under the listed "New parent" node, but keep it also linked at its existing location. (changes to the node in either place thus affect the other location)
							Clone: Make an independent* duplicate of the source-node, and link it under the listed "New parent" node.
								IMPORTANT: While the source-node *itself* is cloned/duplicated, and thus editable independently, any children it carries with it (ie. if "Keep children" is set to "Yes") will only be linked, *not* cloned.
								Thus, the clone's children must themselves also be cloned, if you want to produce a fully independent node-tree.
							Shim: Make a brand new argument-node under the listed "New parent" node, then use this as the parent for the claim-node being transferred in box #2. (this option only shows up when applicable)
						`.AsMultiline(0)}/>
					</Row>
					<Select displayType="button bar" options={transferTypeOptions}
						value={nodeInfo.transferType} onChange={val=>{
							nodeInfo.transferType = val;

							// temp
							if (val != "shim") {
								payload.nodes.filter((a, i)=>i != index).forEach(a=>a.transferType = "ignore");
							}

							Change();
						}}/>
				</RowLR>
				{nodeInfo.transferType != "ignore" &&
				<RowLR mt={5} splitAt={splitAt}>
					{/*<Row>
						<Text>New parent*:</Text>
						<InfoButton ml={5} mt={3} text={`
							More precisely, this is the "destination node" for the transfer, ie. the node under which contents will be placed.
							In a case where the source-node is set to be of type "claim" after transfer, but to a destination child-group that doesn't accept "bare" claim children,
								a wrapper argument will be created to "hold" the cloned claim. (for more info, see the info-box in the "Wrapper" row -- which is visible when relevant)
						`.AsMultiline(0)}/>
					</Row>*/}
					<Text>New parent:</Text>
					<NodePreviewUI key={index} panel="destination" node={newParent} index={1}/>
				</RowLR>}
				{nodeInfo.transferType != "ignore" &&
				<>
					{nodeInfo.transferType == "clone" &&
					<RowLR mt={5} splitAt={splitAt}>
						<Text>Clone details:</Text>
						<Row>
							<Text>Keep children:</Text>
							<Select ml={5} options={[{name: "Yes", value: true}, {name: "No", value: false}]}
								value={nodeInfo.clone_keepChildren} onChange={val=>Change(nodeInfo.clone_keepChildren = val)}/>
							<InfoButton ml={5} text={
							index == 0
								? `
									Yes: All children (*) of the source-node are linked as children of the clone. These children are *not* themselved cloned, they are merely linked.
									No: The clone is created without any children (*).
									
									Exception to the handling above:
									* If this transfer's source-node is a single-premise argument (${payload.nodes.length == 1 ? "in this case, it's not" : "in this case, it is"}), then transfer of that child premise is controlled by the "Transfer #2" section below. 
								`.AsMultiline(0)
								: `
									Yes: All children of the source-node are linked as children of the clone. These children are *not* themselved cloned, they are merely linked.
									No: The clone is created without any children.
								`.AsMultiline(0)}/>
						</Row>
						<Row ml={5}>
							<Text>Convert clone to:</Text>
							<Select ml={5} options={nodeTypeEntries} value={nodeInfo.clone_newType} onChange={val=>Change(nodeInfo.clone_newType = val)}/>
						</Row>
					</RowLR>}
					<RowLR mt={5} splitAt={splitAt}>
						<Text>Link details:</Text>
						<Row>
							<Text>Child group:</Text>
							<Select ml={5} options={GetEntries(ChildGroup)} value={nodeInfo.childGroup}
								onChange={val=>{
									Change(nodeInfo.childGroup = val);
									// todo
								}}/>
						</Row>
						{finalType == MapNodeType.claim &&
						<Row ml={5}>
							<Text>Claim form:</Text>
							<Select ml={5} options={GetEntries(ClaimForm)} value={nodeInfo.claimForm}
								onChange={val=>{
									Change(nodeInfo.claimForm = val);
									// todo
								}}/>
						</Row>}
						{finalType == MapNodeType.argument &&
						<Row ml={5}>
							<Text>Argument polarity:</Text>
							<Select ml={5} options={GetEntries(Polarity)} value={nodeInfo.argumentPolarity}
								onChange={val=>{
									Change(nodeInfo.argumentPolarity = val);
									// todo
								}}/>
						</Row>}
					</RowLR>
				</>}
			</Column>
		</>;
	}
}

@Observer
class NodePreviewUI extends BaseComponent<{panel: "source" | "destination", node: MapNodeL3|n, index: number}, {menuOpened: boolean}> {
	render() {
		const {panel, node, index} = this.props;
		const {menuOpened} = this.state;
		const path = node?.link ? `${node.link?.parent}/${node.link?.child}` : node?.id;

		const backgroundColor = node ? GetNodeColor(node, "background", false).desaturate(0.5).alpha(0.8) : null;
		return (
			<Column style={{flex: 1}}>
				{node &&
				<Row className="cursorSet"
					style={ES(
						{
							/*flex: 1,*/ padding: 5,
							background: backgroundColor!.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)",
							color: liveSkin.NodeTextColor(),
						},
						// selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
					)}
					onClick={e=>{
						//if (e.button !== 2) return false;
						if (e.button !== 0) return false;
						this.SetState({menuOpened: !menuOpened});
					}}>
					<span className="selectable" style={{flex: 1}}>{GetNodeDisplayText(node, path)}</span>
				</Row>}
				{node == null &&
				<Row>(the resulting node of transfer #1 above)</Row>}
				{menuOpened && node &&
				<Row mt={5}>
					{/*<Text>{panel == "source" ? "Source info:" : "Destination info:"}</Text>*/}
					<InfoRect text={`Type: ${MapNodeType[node.type]}`} first={true}/>
					<InfoRect text={`ID: ${node.id}`}/>
					{/*<InfoRect text="Created at: todo"/>
					<InfoRect text="Created by: todo"/>*/}
				</Row>}
			</Column>
		);
	}
}
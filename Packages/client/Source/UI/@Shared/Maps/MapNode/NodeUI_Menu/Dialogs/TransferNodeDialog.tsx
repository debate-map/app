import {ChildGroup, ClaimForm, GetNodeChildrenL3, GetNodeDisplayText, GetNodeL3, LinkNode_HighLevel, MapNodeL3, MapNodeType, Polarity} from "dm_common";
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

export class TransferNodesPayload {
	nodes: NodeInfoForTransfer[];
}
export class NodeInfoForTransfer {
	nodeID: string;
	oldParentID: string;
	transferType: TransferType;
	clone_newType: MapNodeType;
	clone_keepChildren: boolean;

	newParentID?: string|n;
	childGroup: ChildGroup;
	claimForm?: ClaimForm|n;
	argumentPolarity?: Polarity|n;
}
export const TransferType_values = ["ignore", "move", "link", "clone"] as const;
export type TransferType = typeof TransferType_values[number];

export type PayloadOf<T> = T extends Command<infer Payload> ? Payload : never;

export type TransferNodeDialog_SharedProps = {
	payload: TransferNodesPayload,
	Change: Function,
};

export async function ShowTransferNodeDialog(payload_initial: TransferNodesPayload, titleOverride?: string) {
	let payload = payload_initial;
	const uiState = {};

	let root;
	//let nodeEditorUI: NodeDetailsUI|n;
	const Change = (..._)=>{
		payload = Clone(payload); // maybe temp; clone payload each time, so components know to rerender
		boxController.UpdateUI();
	};

	const sharedProps = {payload, Change};

	const boxController = ShowMessageBox({
		title: titleOverride ?? `Pasting node to new location`, cancelButton: true,
		message: observer(()=>{
			return (
				<Column ref={c=>root = c} style={{width: 1000}}>
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
			<Row ml={first ? 0 : 5} style={{background: "rgba(0,0,0,.1)", padding: 3, borderRadius: 3}}>
				{text}
			</Row>
		);
	}
}

@Observer
class TransferNodeUI extends BaseComponent<TransferNodeDialog_SharedProps & {nodeInfo: NodeInfoForTransfer, index: number}, {}> {
	render() {
		const {payload, Change, nodeInfo, index} = this.props;

		const path = nodeInfo.oldParentID ? `${nodeInfo.oldParentID}/${nodeInfo.nodeID}` : nodeInfo.nodeID;
		const node = GetNodeL3(path);
		if (node == null) return;

		const newParent = index == 0 ? GetNodeL3(nodeInfo.newParentID) : null; // todo

		const nodeTypeEntries = GetEntries(MapNodeType, "ui");
		const nodeTypeEntry_orig = nodeTypeEntries.find(a=>a.value == node.type)!;
		nodeTypeEntries.Move(nodeTypeEntry_orig, 0);
		nodeTypeEntry_orig.name = `Keep original type (${nodeTypeEntry_orig.name})`;

		const finalType = nodeInfo.transferType == "clone" && nodeInfo.clone_newType != null ? nodeInfo.clone_newType : node.type;

		const splitAt = 100;
		return <>
			<Row mt={index === 0 ? 0 : 5} style={{fontSize: 16, fontWeight: "bold"}}>Transfer #{index + 1}</Row>
			<Column style={{background: "rgba(0,0,0,.1)", padding: 5, borderRadius: 5}}>
				<NodePreviewUI key={index} panel="source" node={node!} index={0}/>
				{nodeInfo.transferType != "ignore" &&
					<NodePreviewUI key={index} panel="destination" node={index == 0 ? newParent : null} index={1}/>}
				<RowLR splitAt={splitAt} mt={5}>
					<Row>
						<Text>Transfer:</Text>
						<InfoButton ml={5} mt={3} text={`
							Ignore: todo
							Move: todo
							Link: todo
							Clone: todo
						`.AsMultiline(0)}/>
					</Row>
					<Select displayType="button bar" options={TransferType_values.map(a=>({name: ModifyString(a, m=>[m.startLower_to_upper]), value: a}))}
						value={nodeInfo.transferType} onChange={val=>Change(nodeInfo.transferType = val)}/>
				</RowLR>
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

		const backgroundColor = node ? GetNodeColor(node).desaturate(0.5).alpha(0.8) : null;
		const splitAt = 100;
		return (
			<RowLR mt={index === 0 ? 0 : 5} splitAt={splitAt}>
				{/*<Text>{ModifyString(MapNodeType[node.type], m=>[m.startLower_to_upper])}:</Text>*/}
				<Text>{panel == "source" ? "Source node:" : "New parent:"}</Text>
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
					{menuOpened &&
					<Row mt={5}>
						{/*<Text>{panel == "source" ? "Source info:" : "Destination info:"}</Text>*/}
						<InfoRect text="Type: todo" first={true}/>
						<InfoRect text="ID: todo"/>
						<InfoRect text="Created at: todo"/>
						<InfoRect text="Created by: todo"/>
					</Row>}
				</Column>
			</RowLR>
		);
	}
}
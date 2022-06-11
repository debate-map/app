import {ChildGroup, ClaimForm, GetNodeChildrenL3, GetNodeDisplayText, GetNodeL3, LinkNode_HighLevel, MapNodeL3, MapNodeType, Polarity} from "dm_common";
import React from "react";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {ES, InfoButton} from "web-vcore";
import {gql} from "web-vcore/nm/@apollo/client";
import {GetEntries, ModifyString} from "web-vcore/nm/js-vextensions.js";
import {Command} from "web-vcore/nm/mobx-graphlink.js";
import {observer} from "web-vcore/nm/mobx-react.js";
import {Column, Row, RowLR, Select, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

/*
export class TransferType {
	name: string;
	steps: {text: string, extra: string}[];
}
export const transferTypes: TransferType[] = [
	{name: "Move", steps: [
		{text: `Source-node is linked under new location.`, extra: ""},
		{text: `Source-node is unlinked from old location.`, extra: ""},
	]},
	{name: "Link", steps: [
		{text: `Source-node is linked under new location.`, extra: ""},
	]},
	{name: "Clone", steps: [
		{text: `A "clone" of the source-node is created.`, extra: ""},
		{text: `That "clone" is linked under new location.`, extra: ""},
	]},
];
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
}*/

export class TransferNodesPayload {
	nodes: NodeInfoForTransfer[];
}
export class NodeInfoForTransfer {
	nodeID: string;
	oldParentID: string;
	transferType: TransferType;
	clone_newType: MapNodeType;

	newParentID: string;
	childGroup: ChildGroup;
	claimForm?: ClaimForm;
	argumentPolarity?: Polarity;
}
export type TransferType = "ignore" | "move" | "link" | "clone";

export type PayloadOf<T> = T extends Command<infer Payload> ? Payload : never;

export async function ShowTransferNodeDialog(payload_initial: TransferNodesPayload, titleOverride?: string) {
	const payload = payload_initial;
	const uiState = {};

	let root;
	//let nodeEditorUI: NodeDetailsUI|n;
	const Change = (..._)=>boxController.UpdateUI();

	const boxController = ShowMessageBox({
		title: titleOverride ?? `Pasting node to new location`, cancelButton: true,
		message: observer(()=>{
			const sourcePath = `${payload_initial.oldParentID}/${payload_initial.nodeID}`;
			const sourceNode = GetNodeL3(sourcePath);
			const sourceNodeChildren = sourceNode && GetNodeChildrenL3(sourceNode.id, sourcePath);

			const sourceNodeOptions = [
				sourceNode,
				sourceNodeChildren && sourceNodeChildren.length > 0 ? sourceNodeChildren.find(a=>a.type == MapNodeType.claim) : null,
			].filter(a=>a) as MapNodeL3[];
			const destinationNodeOptions = [
				GetNodeL3(`${payload_initial.newParentID}`),
			].filter(a=>a) as MapNodeL3[];
			const validDestinationGroups = GetEntries(ChildGroup);
			//const transferType = transferTypes[2];

			return (
				<Column ref={c=>root = c} style={{width: 1000}}>
					<Row style={{fontSize: 16, fontWeight: "bold"}}>Source node{sourceNodeOptions.length > 0 ? "s" : ""}</Row>
					{sourceNodeOptions.map((source, index)=>{
						return (
							<NodePreviewUI key={index} panel="source" node={source!} index={index}/>
						);
					})}
					{/*<Text>Transfer type:</Text>
					<Column>
						{transferTypes.map((type, index)=>{
							return <TransferTypeButton key={index} type={type} index={index} selected={transferType == type}/>;
						})}
					</Column>
					{transferType == transferTypes[2] &&
					<>
					</>}*/}
					<Row mt={10} style={{fontSize: 16, fontWeight: "bold"}}>Destination node (new parent)</Row>
					{destinationNodeOptions.map((node, index)=>{
						return (
							<NodePreviewUI key={index} panel="destination" node={node!} index={index}/>
						);
					})}
					<Row>
						<Text>Child-group:</Text>
						<Select ml={5} options={validDestinationGroups} value={payload.nodes[0].childGroup}
							onChange={val=>{
								Change(payload.nodes.forEach(a=>a.childGroup = val));
								// todo
							}}/>
					</Row>
					<Row>
						<Text>Form:</Text>
						<Select ml={5} options={GetEntries(ClaimForm)} value={payload.nodes[0].claimForm}
							onChange={val=>{
								Change(payload.nodes.forEach(a=>a.claimForm = val));
								// todo
							}}/>
					</Row>
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

class NodePreviewUI extends BaseComponent<{panel: "source" | "destination", node: MapNodeL3, index: number}, {}> {
	render() {
		const {panel, node, index} = this.props;
		const path = node.link ? `${node.link?.parent}/${node.link?.child}` : node.id;
		const transferType = "Clone";
		const cloneAsType = node.type;

		const backgroundColor = GetNodeColor(node).desaturate(0.5).alpha(0.8);
		const splitAt = 90;
		return (
			<Column mt={index === 0 ? 0 : 5} style={{
				background: "rgba(0,0,0,.1)", padding: 5, borderRadius: 5,
			}}>
				<RowLR splitAt={splitAt}>
					<Text>{ModifyString(MapNodeType[node.type], m=>[m.startLower_to_upper])}:</Text>
					<Row className="cursorSet"
						style={ES(
							{
								flex: 1, padding: 5,
								background: backgroundColor.css(), borderRadius: 5, /*cursor: "pointer",*/ border: "1px solid rgba(0,0,0,.5)",
								color: liveSkin.NodeTextColor(),
							},
							// selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
						)}
						onMouseDown={e=>{
							if (e.button !== 2) return false;
							this.SetState({menuOpened: true});
						}}>
						<span className="selectable" style={{flex: 1}}>{GetNodeDisplayText(node, path)}</span>
					</Row>
				</RowLR>
				{panel == "source" && <RowLR splitAt={splitAt} mt={5}>
					<Row>
						<Text>Transfer:</Text>
						<InfoButton ml={5} mt={3} text={`
							Ignore: todo
							Move: todo
							Link: todo
							Clone: todo
						`.AsMultiline(0)}/>
					</Row>
					<Select displayType="button bar" options={["Ignore", `Move`, `Link`, "Clone"]} value={transferType}/>
					{transferType == "Clone" &&
					<Row>
						<Text ml={5}>Clone as:</Text>
						<Select ml={5} options={GetEntries(MapNodeType)} value={cloneAsType}/>
					</Row>}
				</RowLR>}
			</Column>
		);
	}
}
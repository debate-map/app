import {CheckLinkIsValid, ChildGroup, ClaimForm, GetNodeDisplayText, GetNodeL3, IsWrapperArgNeededForTransfer, NodeL3, NodeType, NodeInfoForTransfer, NodeTagCloneType, Polarity, TransferNodesPayload, TransferType} from "dm_common";
import React, {useState} from "react";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {RunCommand_TransferNodes} from "Utils/DB/Command.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {ES, InfoButton} from "web-vcore";
import {GetEntries, GetValues, ModifyString} from "js-vextensions";
import {observer_mgl} from "mobx-graphlink";
import {Column, Row, RowLR, Select, Text} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {TransferNodesUIState} from "./TransferNodeDialog/TransferNodeData.js";

export type TransferNodeDialog_SharedProps = {
	payload: TransferNodesPayload,
	uiState: TransferNodesUIState,
	Change: Function,
};

export async function ShowTransferNodeDialog(payload_initial: TransferNodesPayload, uiState_initial: TransferNodesUIState, titleOverride?: string) {
	const payload = payload_initial;
	const uiState = uiState_initial;

	let root;
	//let nodeEditorUI: NodeDetailsUI|n;
	const Change = (..._)=>{
		// maybe temp; clone payload and such each time, so components know to rerender
		/*payload = Clone(payload);
		uiState = Clone(uiState);
		sharedProps = {payload, uiState, Change};*/

		boxController.options.okButtonProps = {enabled: payload.nodes.Any(a=>a.transferType != "ignore")};
		boxController.UpdateUI();
	};

	const sharedProps: TransferNodeDialog_SharedProps = {payload, uiState, Change};

	const boxController = ShowMessageBox({
		title: titleOverride ?? `Pasting node to new location`, cancelButton: true,
		message: observer_mgl(()=>{
			return (
				<Column ref={c=>{root = c}} style={{width: 1000}}>
					{payload.nodes.length > 1 &&
					<Row mb={5} style={{whiteSpace: "pre-wrap"}}>{`
						Note: The source for this transfer (ie. the node-box you pressed "${{move: "Cut", link: "Copy", clone: "Clone", shim: "Clone"}[payload_initial.nodes[0].transferType]}" on), is actually a "combined node-box", representing two nodes:
						1) A claim node; this is the statement/premise that, if true, is supposed to ${
							uiState_initial.destinationChildGroup.IsOneOf("truth", "relevance", "neutrality")
								? `impact the ${uiState_initial.destinationChildGroup} of the ancestor node`
								: `have significance relative to the ancestor node`
						}.
						2) An argument node; this node "wraps" its child claim node mentioned above, marking it for usage in that specific context.
						Generally, you'll want to choose "shim" for the argument node (in box #1 below), and "move", "link", or "clone" for the claim node (in box #2 below).
					`.AsMultiline(0)}</Row>}

					{payload.nodes.map((nodeInfo, index)=>{
						const indexAndTime = `${index}_${Date.now()}`; // add time, so that the TransferNodeUI comp refreshes every time (since the passed structures are just mutating)
						return <TransferNodeUI key={indexAndTime} {...sharedProps} nodeInfo={nodeInfo} index={index}/>;
					})}
					{/*<CheckBox text="Preview steps that will be taken" value={true}/>
					<Row>Step 1: todo</Row>
					<Row>Step 2: todo</Row>
					<Row>Step 3: todo</Row>*/}
				</Column>
			);
		}),
		onOK: ()=>{
			// temp; if an "Issue: XXX" element is present in the dialog's UI, block pressing OK (ie. execution of the dialog/command)
			if (document.querySelector(".transferNodeBlocker") != null) {
				return false;
			}

			(async()=>{
				/*const result = await apolloClient.mutate({
					mutation: gql`
						mutation($payload: JSON!) {
							TransferNodes(payload: $payload) {
								message
							}
						}
					`,
					variables: {
						//payload,
						//payload: RemoveNullProps(Clone(payload)),
						...payload,
					},
					//fetchPolicy: "network-only",
				});*/
				/*const command = new TransferNodes(payload);
				const result = await command.RunOnServer();*/
				const result = await RunCommand_TransferNodes(payload);
				console.log("Got result:", result);
			})();
		},
	});
}

type  InfoRect_Props = {
	text: string,
	first?: boolean,
};

const InfoRect = (props: InfoRect_Props)=>{
	const {text, first} = props;
	return (
		<Row ml={first ? 0 : 5} sel style={{background: "rgba(0,0,0,.1)", padding: 3, borderRadius: 3}}>
			{text}
		</Row>
	);
}

function GetTransferNodeFinalType(nodeInfo: NodeInfoForTransfer) {
	const path = nodeInfo.oldParentID ? `${nodeInfo.oldParentID}/${nodeInfo.nodeID}` : nodeInfo.nodeID;
	const node = GetNodeL3(path);
	if (node == null) return null;
	return nodeInfo.transferType == "clone" && nodeInfo.clone_newType != null ? nodeInfo.clone_newType : node.type;
}
export function TransferNodeNeedsWrapper(nodeInfo: NodeInfoForTransfer, uiState: TransferNodesUIState) {
	const finalType = GetTransferNodeFinalType(nodeInfo);
	if (finalType == null) return false;

	return nodeInfo.transferType != "ignore" && IsWrapperArgNeededForTransfer(uiState.destinationParent.type, uiState.destinationChildGroup, finalType, nodeInfo.childGroup);
}

type TransferNodeUI_Props ={
	nodeInfo: NodeInfoForTransfer,
	index: number
} & TransferNodeDialog_SharedProps;

const TransferNodeUI = observer_mgl((props: TransferNodeUI_Props)=>{
	const {payload, uiState, Change, nodeInfo, index} = props;

	const earlierNodeInfos = payload.nodes.slice(0, index);
	const earlierNodeInfo_transferring = earlierNodeInfos.find(a=>a.transferType != "ignore");
	/*let newParent: NodeL3|n;
	if (earlierNodeInfo_transferring?.transferType == "shim") newParent = null;
	else if (earlierNodeInfo_transferring != null) newParent = GetNodeL3(`${earlierNodeInfo_transferring.nodeID}`);
	else newParent = uiState.destinationParent;*/
	const newParentType = earlierNodeInfo_transferring != null ? GetTransferNodeFinalType(earlierNodeInfo_transferring) : uiState.destinationParent.type;
	if (newParentType == null) return "Transfer #1 is invalid; cannot retrieve data for its source-node.";
	const newParent = earlierNodeInfo_transferring != null ? null : uiState.destinationParent;

	const path = nodeInfo.oldParentID ? `${nodeInfo.oldParentID}/${nodeInfo.nodeID}` : nodeInfo.nodeID;
	const node = GetNodeL3(path);
	if (node == null) return;

	const nodeTypeEntries = GetEntries(NodeType, "ui");
	const nodeTypeEntry_orig = nodeTypeEntries.find(a=>a.value == node.type)!;
	nodeTypeEntries.Move(nodeTypeEntry_orig, 0);
	nodeTypeEntry_orig.name = `Keep original type (${nodeTypeEntry_orig.name})`;

	const finalType = GetTransferNodeFinalType(nodeInfo);
	if (finalType == null) return;

	//const wrapperSection = nodeInfo.transferType != "ignore" && IsWrapperArgNeededForTransfer(finalType, nodeInfo.childGroup);

	const transferTypeOptions = GetValues(TransferType).map(a=>({name: ModifyString(a, m=>[m.startLower_to_upper]), value: a}));
	const isArgumentForCombined = index == 0 && payload.nodes.length > 1;
	const canBeShim = isArgumentForCombined; //&& TransferNodeNeedsWrapper(payload.nodes[1], uiState);
	if (!canBeShim) transferTypeOptions.Remove(transferTypeOptions.find(a=>a.value == "shim"));
	// temp: disable the Move and Link options for now, since not yet implemented in new transfer system
	transferTypeOptions.filter(a=>a.value == "move" || a.value == "link").forEach(a=>a["style"] = {pointerEvents: "none", opacity: .5, cursor: "default"});

	const splitAt = 110;
	const yesAndNoOpts = [{name: "Yes", value: true}, {name: "No", value: false}];
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
							IMPORTANT: While the source-node *itself* is cloned/duplicated (and thus editable independently), any children the clone carries with it (ie. if "Keep children" is set to "Yes") will only be linked, *not* cloned.
							Thus, the clone's children/descendants must themselves also be cloned afterward, if you want to produce a fully independent node-tree.
						Shim: Make a brand new argument-node under the listed "New parent" node, then use this as the parent for the claim-node being transferred in box #2. (this option only shows up when applicable)

						Note: The Move and Link options are disabled at the moment, since their implementation in the new transfer system is not yet complete.
					`.AsMultiline(0)}/>
				</Row>
				<Select displayType="button bar" options={transferTypeOptions} value={nodeInfo.transferType} onChange={val=>{
					nodeInfo.transferType = val;
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
						<Select ml={5} options={yesAndNoOpts}
							value={nodeInfo.clone_keepChildren} onChange={val=>Change(nodeInfo.clone_keepChildren = val)}/>
						<InfoButton ml={5} text={
						index == 0
							? `
								Yes: All children (^1) of the source-node are linked as children of the clone. These children are *not* themselved cloned, they are merely linked (^2).
								No: The clone is created without any children (^1).

								^1: If this transfer's source-node is a single-premise argument (${payload.nodes.length == 1 ? "in this case, it's not" : "in this case, it is"}), then transfer of that child premise is controlled by the "Transfer #2" section below.
								^2: Exception: If old-node-type is category (with claim children), and new-node-type is claim, then children claims are wrapped into argument nodes. (for fixing common structuring mistake)
							`.AsMultiline(0)
							: `
								Yes: All children of the source-node are linked as children of the clone. These children are *not* themselved cloned, they are merely linked (^1).
								No: The clone is created without any children.

								^1: Exception: If old-node-type is category (with claim children), and new-node-type is claim, then children claims are wrapped into argument nodes. (for fixing common structuring mistake)
							`.AsMultiline(0)}/>
					</Row>
					<Row ml={5}>
						<Text>Keep tags:</Text>
						<Select ml={5} options={GetEntries(NodeTagCloneType)}
							value={nodeInfo.clone_keepTags} onChange={val=>Change(nodeInfo.clone_keepTags = val)}/>
						<InfoButton ml={5} text={`
							Minimal: No tags are cloned, other than one exception: Any "clone history" tags that had the old node as the result/last-entry, will be cloned and extended.
							Basics: The "minimal" tags (described above) will be cloned, plus any "basic" tag-types: labels
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
					{finalType == NodeType.claim &&
					<Row ml={5}>
						<Text>Claim form:</Text>
						<Select ml={5} options={GetEntries(ClaimForm)} value={nodeInfo.claimForm}
							onChange={val=>{
								Change(nodeInfo.claimForm = val);
								// todo
							}}/>
					</Row>}
					{finalType == NodeType.argument &&
					<Row ml={5}>
						<Text>Argument polarity:</Text>
						<Select ml={5} options={GetEntries(Polarity)} value={nodeInfo.argumentPolarity}
							onChange={val=>{
								Change(nodeInfo.argumentPolarity = val);
								// todo
							}}/>
					</Row>}
				</RowLR>
				{(()=>{
					const validityError = CheckLinkIsValid(newParentType, finalType, nodeInfo.childGroup, finalType == NodeType.argument ? nodeInfo.argumentPolarity : null);
					if (validityError) {
						return <Row mt={5} style={{color: "red"}}
							// temp; add special class-name, which blocks dialog from proceeding / having OK pressed
							className="transferNodeBlocker"
						>
							{/*`Issue: This transfer's selected child-group (${ChildGroup[nodeInfo.childGroup]}) is not valid given its transfer context. (${CheckValidityOfLink(newParentType, nodeInfo.childGroup, finalType)})`*/}
							{`Issue: ${validityError}`}
						</Row>;
					}
				})()}
			</>}
		</Column>
	</>;
});

type NodePreviewUI_Props = {
	panel: "source" | "destination",
	node: NodeL3|n,
	index: number
};

const NodePreviewUI = observer_mgl((props: NodePreviewUI_Props)=>{
	const {node} = props;
	const [menuOpened, setMenuOpened] = useState(false);
	const path = node?.link ? `${node.link?.parent}/${node.link?.child}` : node?.id;

	const backgroundColor = node ? GetNodeColor(node, "background", false).alpha(0.8) : null;

	return (
		<Column style={{flex: 1}}>
			{node &&
			<Row className="useLightText cursorSet"
				style={ES(
					{
						padding: 5,
						background: backgroundColor!.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)",
						color: liveSkin.NodeTextColor(),
					},
				)}
				onClick={e=>{
					if (e.button !== 0) return false;
					setMenuOpened(prev=>!prev);
				}}>
				<span className="selectable" style={{flex: 1}}>{GetNodeDisplayText(node, path)}</span>
			</Row>}
			{node == null &&
			<Row>(the resulting node of transfer #1 above)</Row>}
			{menuOpened && node &&
			<Row mt={5}>
				<InfoRect text={`Type: ${NodeType[node.type]}`} first={true}/>
				<InfoRect text={`ID: ${node.id}`}/>
			</Row>}
		</Column>
	);
});

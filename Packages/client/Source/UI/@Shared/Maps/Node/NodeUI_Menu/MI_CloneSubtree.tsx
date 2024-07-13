import {CheckLinkIsValid, ChildGroup, ClaimForm, GetNodeL3, GetParentNodeL3, HasAdminPermissions, NodeType, MeID, NodeInfoForTransfer, NodeTagCloneType, Polarity, TransferNodes, TransferNodesPayload, TransferType} from "dm_common";
import React from "react";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {InfoButton, Observer} from "web-vcore";
import {gql} from "@apollo/client";
import {GetEntries, GetValues, ModifyString} from "js-vextensions";
import {SlicePath, observer_mgl} from "mobx-graphlink";
import {observer} from "mobx-react";
import {Button, Column, Row, RowLR, Select, Text} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {MI_SharedProps} from "../NodeUI_Menu.js";

export class CloneSubtreePayload {
	parentNodeID: string;
	rootNodeID: string;
	maxDepth?: number|n;
}
export class CloneSubtreeUIState {
	expectedCloneCount?: number|n;
}

@Observer
export class MI_CloneSubtree extends BaseComponent<MI_SharedProps, {}> {
	render() {
		const {map, node, path} = this.props;
		if (map == null) return null;
		if (!HasAdminPermissions(MeID())) return null;
		//const formForClaimChildren = node.type == NodeType.category ? ClaimForm.question : ClaimForm.base;

		// we "initiate a clone" for the "outer" argument node, if there's a box combining an argument and claim (this is how the dialog expects such a case)
		const pathToClone = path;
		const nodeToClone = GetNodeL3(pathToClone);
		if (nodeToClone == null) return null; // node just deleted?

		const parentOfNodeToClone = GetParentNodeL3(pathToClone);
		if (parentOfNodeToClone == null || nodeToClone.link == null) return null; // cannot clone a map's root-node (for now anyway)

		const payload_initial: CloneSubtreePayload = {
			parentNodeID: parentOfNodeToClone.id,
			rootNodeID: nodeToClone.id,
			maxDepth: 100,
		};
		const uiState_initial: CloneSubtreeUIState = {
			expectedCloneCount: null,
		};

		return (
			<VMenuItem text={<span>Clone subtree</span> as any}
				style={liveSkin.Style_VMenuItem()} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					ShowCloneSubtreeDialog(payload_initial, uiState_initial);
				}}/>
		);
	}
}

export type CloneSubtreeDialog_SharedProps = {
	payload: CloneSubtreePayload,
	uiState: CloneSubtreeUIState,
	Change: Function,
};

export async function ShowCloneSubtreeDialog(payload_initial: CloneSubtreePayload, uiState_initial: CloneSubtreeUIState) {
	const payload = payload_initial;
	const uiState = uiState_initial;

	let root;
	const Change = (..._)=>{
		boxController.options.okButtonProps = {enabled: uiState.expectedCloneCount != null && uiState.expectedCloneCount > 0};
		boxController.UpdateUI();
	};

	const sharedProps: CloneSubtreeDialog_SharedProps = {payload, uiState, Change};

	const boxController = ShowMessageBox({
		okButtonProps: {enabled: false}, // start disabled (see Change function for updating)
		title: "Clone subtree", cancelButton: true,
		message: observer_mgl(()=>{
			return (
				<Column ref={c=>root = c} style={{width: 1000}}>
					<Row style={{whiteSpace: "pre-wrap"}}>{`
						Are you sure you want to clone this entire subtree?
						* This process cannot (easily) be undone, and could result in more nodes being cloned than intended. (eg. if the root-node of some other map were linked within this subtree)

						Before proceeding, press the button below to get a preview of the number of nodes that will be cloned.
					`.AsMultiline(0)}</Row>
					<Row>
						<Button text="Preview clone count" onClick={async()=>{
							const result = await apolloClient.query({
								query: gql`
									query($rootNodeID: String, $maxDepth: Int) {
										subtree(rootNodeId: $rootNodeID, maxDepth: $maxDepth) {
											nodes {
												id
											}
										}
									}
								`,
								variables: {
									rootNodeID: payload.rootNodeID,
									maxDepth: payload.maxDepth,
								},
							});
							const expectedCloneCount = result.data.subtree.nodes.length;
							Change(uiState.expectedCloneCount = expectedCloneCount);
						}}/>
						{uiState.expectedCloneCount != null &&
						<Text ml={5}>Expected clone count:{uiState.expectedCloneCount}</Text>}
					</Row>
				</Column>
			);
		}),
		onOK: ()=>{
			(async()=>{
				const result = await apolloClient.mutate({
					mutation: gql`
						mutation($payload: JSON!) {
							cloneSubtree(payload: $payload) {
								message
							}
						}
					`,
					variables: {payload},
				});
				console.log("Clone-subtree result:", result);
			})();
		},
	});
}
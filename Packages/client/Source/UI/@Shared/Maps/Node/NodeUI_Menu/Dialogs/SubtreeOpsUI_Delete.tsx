import {store} from "Store";
import React, {useState} from "react";
import {Button, Button_styles, CheckBox, Column, Row, RowLR, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {AccessPolicy, GetAccessPolicy, NodeL1} from "dm_common";
import {E} from "js-vextensions";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {MI_SharedProps} from "../../NodeUI_Menu.js";
import {useSubtreeRetrievalQueryOrAccessors} from "../MI_SubtreeOps.js";
import {PolicyPicker, PolicyPicker_Button} from "../../../../../Database/Policies/PolicyPicker.js";
import {CommandEntry, RunCommandBatch} from "../../../../../../Utils/DB/RunCommandBatch.js";
import {SubtreeIncludeKeys} from "./SubtreeOpsStructs.js";
import {RunCommand_DeleteSubtree} from "../../../../../../Utils/DB/Command.js";
import {UserPicker_Button} from "../../../../Users/UserPicker.js";

const splitAt = 150;

export class SubtreeOpsUI_Delete_Left extends BaseComponentPlus(
	{} as {} & MI_SharedProps,
	{},
) {
	render() {
		let {} = this.props;
		const {} = this.state;
		const dialogState = store.main.maps.subtreeOperationsDialog;

		return (
			<>
				<RowLR mt={5} splitAt={splitAt}>
					<Row center>
						<Text>Deletion depth:</Text>
						<InfoButton ml={5} text={`This value is automatically set to the retrieval max-depth (set above). [they need to match for the previewing/checking to work]`}/>
					</Row>
					<Spinner ml={5} min={0} max={30} enabled={false} value={dialogState.maxExportDepth} onChange={val=>RunInAction_Set(this, ()=>dialogState.maxExportDepth = val)}/>
				</RowLR>
			</>
		);
	}
}

@Observer
export class SubtreeOpsUI_Delete_Right extends BaseComponent<{} & MI_SharedProps, {retrievalActive: boolean, serverOpInProgress: boolean, serverOp_commandsCompleted: number}> {
	static initialState = {serverImport_commandsCompleted: 0};
	render() {
		const {mapID, node: rootNode, path: rootNodePath} = this.props;
		const {retrievalActive, serverOpInProgress, serverOp_commandsCompleted} = this.state;
		const dialogState = store.main.maps.subtreeOperationsDialog;
		const includeKeys_minimal = new SubtreeIncludeKeys({
			nodes: ["id", "accessPolicy", "creator"],
			nodeLinks: ["parent", "child"],
			nodeRevisions: [],
			nodePhrasings: [],
			terms: [],
			medias: [],
		});

		const {subtreeData} = useSubtreeRetrievalQueryOrAccessors(rootNode, rootNodePath, includeKeys_minimal, dialogState.retrievalMethod, dialogState.maxExportDepth, retrievalActive);
		const nodesRetrieved_orig = subtreeData?.nodes ?? [];
		const nodesRetrieved_toDelete: NodeL1[] = nodesRetrieved_orig; // todo
		const nodesRetrieved_toUnlink: NodeL1[] = []; // todo

		const accessPoliciesOfNodesToDelete = nodesRetrieved_toDelete.map(a=>a.accessPolicy).Distinct();
		const accessPoliciesOfNodesToDelete_matches = accessPoliciesOfNodesToDelete.ToMap(policyID=>policyID, policyID=>nodesRetrieved_toDelete.filter(a=>a.accessPolicy == policyID).length ?? 0);

		const creatorsOfNodesToDelete = nodesRetrieved_toDelete.map(a=>a.creator).Distinct();
		const creatorsOfNodesToDelete_matches = creatorsOfNodesToDelete.ToMap(creatorID=>creatorID, creatorID=>nodesRetrieved_toDelete.filter(a=>a.creator == creatorID).length ?? 0);

		const Header = (p: {children: React.ReactNode})=><Row mt={20} style={{fontSize: 16, fontWeight: "bold"}}>{p.children}</Row>;
		return (
			<Column style={{flex: 1}}>
				<Row>
					<CheckBox enabled={!serverOpInProgress} text={`Start retrieval${nodesRetrieved_orig.length > 0 ? ` (nodes in subtree: ${nodesRetrieved_orig.length})` : ""}`}
						value={retrievalActive} onChange={val=>this.SetState({retrievalActive: val})}/>
					<Row ml="auto"></Row>
				</Row>
				<div style={{marginTop: 5}}>
					<span style={{display: "inline", whiteSpace: "pre", fontWeight: "bold"}}>Note:</span>
					<Text style={{display: "inline", whiteSpace: "pre-wrap"}}> This operation will only delete nodes/subtrees that have no other parent. If a node is encountered with more than one parent, it will merely be unlinked, rather than deleted.</Text>
				</div>

				<Header>Preview</Header>
				<Row>
					<Text style={{fontWeight: "bold"}}>Nodes to delete: {nodesRetrieved_toDelete.length}</Text>
				</Row>
				<Row>
					<Text style={{fontWeight: "bold"}}>Nodes to unlink: {nodesRetrieved_toUnlink.length}</Text>
				</Row>
				<Column mt={5}>
					<Text>Access-policies of nodes to delete:</Text>
					<Column>
						{accessPoliciesOfNodesToDelete.OrderByDescending(id=>accessPoliciesOfNodesToDelete_matches.get(id)).map(policyID=>{
							//return <div key={policyID} style={E(filterEntry_styleBase)}>{policyID} [{accessPoliciesInSubtree_matches.get(policyID)}]</div>;
							return <Row key={policyID} mt={5}>
								<PolicyPicker_Button policyID={policyID} idTrimLength={3} enabled={true} style={E(
									{flex: 1, padding: "3px 10px", pointerEvents: "none"},
									//{background: Button_styles.root.backgroundColor},
									{background: "rgba(30,100,30,.5)"},
								)}/>
								<Text ml={5} style={{minWidth: 100, justifyContent: "center", fontSize: 13}}>({accessPoliciesOfNodesToDelete_matches.get(policyID)} matches)</Text>
							</Row>;
						})}
					</Column>
				</Column>
				<Column mt={5}>
					<Text>Creators of nodes to delete:</Text>
					<Column>
						{creatorsOfNodesToDelete.OrderByDescending(id=>creatorsOfNodesToDelete_matches.get(id)).map(userID=>{
							//return <div key={policyID} style={E(filterEntry_styleBase)}>{policyID} [{accessPoliciesInSubtree_matches.get(policyID)}]</div>;
							return <Row key={userID} mt={5}>
								<UserPicker_Button userID={userID} idTrimLength={3} enabled={true} style={E(
									{flex: 1, padding: "3px 10px", pointerEvents: "none"},
									//{background: Button_styles.root.backgroundColor},
									{background: "rgba(30,100,30,.5)"},
								)}/>
								<Text ml={5} style={{minWidth: 100, justifyContent: "center", fontSize: 13}}>({creatorsOfNodesToDelete_matches.get(userID)} matches)</Text>
							</Row>;
						})}
					</Column>
				</Column>

				<Header>Execution</Header>
				<Row mt={5} p={3} style={{textAlign: "center", background: "rgba(255,255,0,.3)", color: "red", borderRadius: 25, border: "1px solid rgba(0,0,0,.3)"}}>
					<div>
						Warning: Once started, the batch operation cannot be stopped. It also cannot be undone. (short of a full database restore)
						<InfoButton ml={5} style={{verticalAlign: "middle"}} text={`
							Technically, you may be able to cancel the operation by quickly closing/refreshing the page to early-drop the graphql subscription.
							
							Because these batch operations can complete quickly in some cases though, this is unreliable and shouldn't be relied on!
						`.AsMultiline(0)}/>
					</div>
				</Row>
				<Row mt={5}>
					<Button enabled={nodesRetrieved_toDelete.length > 0 && !serverOpInProgress} style={{flex: 1}}
						text={`Start batch deletion of node subtree (affecting ${nodesRetrieved_toDelete.length}+${nodesRetrieved_toUnlink.length} nodes)`}
						onClick={()=>{
							ShowMessageBox({
								title: `Start batch operation on ${nodesRetrieved_toDelete.length}+${nodesRetrieved_toUnlink.length} nodes?`, cancelButton: true,
								message: `If the node subtree is large, this could take a long time. You can view the progress in the progress label below the start button.`,
								onOK: async()=>{
									this.SetState({serverOpInProgress: true, serverOp_commandsCompleted: 0});
									try {
										const result = await RunCommand_DeleteSubtree({mapID, rootNodeID: rootNode.id}, (subcommandsCompleted, subcommandsTotal)=>{
											this.SetState({serverOp_commandsCompleted: subcommandsCompleted});
										});
										ShowMessageBox({
											title: "Subtree deletion operation succeeded",
											message: `Subtree deletion has completed. Commands in batch completed: ${result.subcommandResults.length ?? 0}`,
										});
									} catch (ex) {
										ShowMessageBox({
											title: `Subtree deletion failed`,
											message: `Subtree deletion has failed (no changes *should* have been persisted). Error details: ${ex}`,
										});
									}
									this.SetState({
										retrievalActive: false, // also reset retrieval-active to false (so that UI doesn't show the stale retrieval results anymore)
										serverOpInProgress: false, serverOp_commandsCompleted: 0,
									});
								},
							});
						}}/>
				</Row>
				{serverOpInProgress &&
				<Row>
					Progress: {serverOp_commandsCompleted}/{nodesRetrieved_toDelete.length + nodesRetrieved_toUnlink.length}
				</Row>}
			</Column>
		);
	}
}
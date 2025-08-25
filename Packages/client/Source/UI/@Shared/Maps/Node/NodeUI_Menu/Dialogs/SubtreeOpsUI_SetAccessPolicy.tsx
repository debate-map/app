import {store} from "Store";
import React, {useState} from "react";
import {Button, Button_styles, CheckBox, Column, Row, RowLR, Text} from "react-vcomponents";
import {InfoButton, RunInAction_Set} from "web-vcore";
import {AccessPolicy, GetAccessPolicy, NodeL1} from "dm_common";
import {E} from "js-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {MI_SharedProps} from "../../NodeUI_Menu.js";
import {useSubtreeRetrievalQueryOrAccessors} from "../MI_SubtreeOps.js";
import {PolicyPicker, PolicyPicker_Button} from "../../../../../Database/Policies/PolicyPicker.js";
import {CommandEntry, RunCommandBatch} from "../../../../../../Utils/DB/RunCommandBatch.js";
import {SubtreeIncludeKeys} from "./SubtreeOpsStructs.js";
import {observer_mgl} from "mobx-graphlink";

const splitAt = 150;
export const SubtreeOpsUI_SetAccessPolicy_Left = (props: MI_SharedProps)=>{
	return (
		<>
			<RowLR mt={5} splitAt={splitAt}>
				<Text>TODO:</Text>
			</RowLR>
		</>
	);
}

type State = {
	retrievalActive: boolean,
	serverImportInProgress: boolean,
	serverImport_commandsCompleted: number
};

export const SubtreeOpsUI_SetAccessPolicy_Right = observer_mgl((props: MI_SharedProps)=>{
	const {node: rootNode, path: rootNodePath} = props;
	const [{retrievalActive, serverImportInProgress, serverImport_commandsCompleted}, setState] = useState<State>({
		serverImport_commandsCompleted: 0,
		retrievalActive: false,
		serverImportInProgress: false,
	});
	const dialogState = store.main.maps.subtreeOperationsDialog;
	const {setPolicy_oldAccessPolicies, setPolicy_newPolicyID} = dialogState;
	const includeKeys_minimal = new SubtreeIncludeKeys({
		nodes: ["id", "accessPolicy"],
		nodeLinks: ["parent", "child"],
		nodeRevisions: [],
		nodePhrasings: [],
		terms: [],
		medias: [],
	});

	const newPolicy = GetAccessPolicy(setPolicy_newPolicyID);

	const {subtreeData} = useSubtreeRetrievalQueryOrAccessors(rootNode, rootNodePath, includeKeys_minimal, dialogState.retrievalMethod, dialogState.maxExportDepth, retrievalActive);
	const nodesRetrieved_orig = subtreeData?.nodes ?? [];
	const nodesRetrieved_filtered = subtreeData?.nodes?.filter(node=>{
		if (!setPolicy_oldAccessPolicies.includes(node.accessPolicy)) return false;
		return true;
	}) ?? [];

	const accessPoliciesInSubtree = [
		...(subtreeData?.nodes?.map(a=>a.accessPolicy) ?? []),
		...setPolicy_oldAccessPolicies, // add in any polices that are already "checked" as a filter, even if there are currently no node matches (allows user to uncheck it)
	].Distinct();
	const accessPoliciesInSubtree_matches = accessPoliciesInSubtree.ToMap(policyID=>policyID, policyID=>subtreeData?.nodes?.filter(a=>a.accessPolicy == policyID).length ?? 0);

	const Header = (p: {children: React.ReactNode})=><Row mt={20} style={{fontSize: 16, fontWeight: "bold"}}>{p.children}</Row>;

	return (
		<Column style={{flex: 1}}>
			<Row>
				<CheckBox enabled={!serverImportInProgress} text={`Start retrieval${nodesRetrieved_orig.length > 0 ? ` (nodes in subtree: ${nodesRetrieved_orig.length}, after filtering: ${nodesRetrieved_filtered.length})` : ""}`}
					value={retrievalActive} onChange={val=>setState(prev=>({...prev, retrievalActive: val}))}/>
				<Row ml="auto"></Row>
			</Row>

			<Row mt={20} style={{fontWeight: "bold"}}>Filtering</Row>
			{/*<Column mt={5}>
				<Text>Filter by parent counts:</Text>
				<Row mt={5} style={{flexWrap: "wrap", gap: 5}}>
					{parentCountsInSubtree.OrderBy(a=>a).map(count=>{
						return <Button key={count} enabled={!serverImportInProgress}
							text={`${count} parent${count == 1 ? "" : "s"} (${parentCountsInSubtree_matches.get(count)} matches)`}
							style={E(
								{padding: "2px 5px"},
								setPolicy_oldParentCounts.includes(count) && {backgroundColor: "rgba(30,100,30,.5)"},
							)}
							onClick={()=>{
								RunInAction_Set(this, ()=>{
									if (setPolicy_oldParentCounts.includes(count)) dialogState.setPolicy_oldParentCounts.Remove(count);
									else dialogState.setPolicy_oldParentCounts.push(count);
								});
							}}/>;
					})}
				</Row>
			</Column>*/}
			<Column mt={5}>
				<Text>Filter by old access-policies:</Text>
				<Column>
					{accessPoliciesInSubtree.OrderByDescending(id=>accessPoliciesInSubtree_matches.get(id)).map(policyID=>{
						//return <div key={policyID} style={E(filterEntry_styleBase)}>{policyID} [{accessPoliciesInSubtree_matches.get(policyID)}]</div>;
						return <Row key={policyID} mt={5}>
							<PolicyPicker_Button policyID={policyID} idTrimLength={3} enabled={!serverImportInProgress} style={E(
								{flex: 1, padding: "3px 10px"},
								//setPolicy_oldAccessPolicies.includes(policyID) && {backgroundColor: "rgba(30,100,30,.5)"},
								// the above does not work fsr (never becomes green); to fix, we use this hack of using "background" key instead, and just ensure we always set it
								!setPolicy_oldAccessPolicies.includes(policyID) && {background: Button_styles.root.backgroundColor},
								setPolicy_oldAccessPolicies.includes(policyID) && {background: "rgba(30,100,30,.5)"},
							)} onClick={()=>{
								RunInAction_Set(()=>{
									if (setPolicy_oldAccessPolicies.includes(policyID)) dialogState.setPolicy_oldAccessPolicies.Remove(policyID);
									else dialogState.setPolicy_oldAccessPolicies.push(policyID);
								});
							}}/>
							<Text ml={5} style={{minWidth: 100, justifyContent: "center", fontSize: 13}}>({accessPoliciesInSubtree_matches.get(policyID)} matches)</Text>
						</Row>;
					})}
				</Column>
			</Column>

			<Header>Modifications</Header>
			<RowLR mt={5} splitAt={splitAt}>
				<Text>New access-policy:</Text>
				<PolicyPicker containerStyle={{flex: null}} value={setPolicy_newPolicyID} onChange={val=>RunInAction_Set(()=>dialogState.setPolicy_newPolicyID = val)}>
					<PolicyPicker_Button policyID={setPolicy_newPolicyID} idTrimLength={3} enabled={!serverImportInProgress} style={{padding: "3px 10px"}}/>
				</PolicyPicker>
			</RowLR>

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
				<Button enabled={newPolicy != null && nodesRetrieved_filtered.length > 0 && !serverImportInProgress} style={{flex: 1}}
					text={`Start batch-setting of access-policies (${nodesRetrieved_filtered.length} nodes)`}
					onClick={()=>{
						ShowMessageBox({
							title: `Start batch operation on ${nodesRetrieved_filtered.length} nodes?`, cancelButton: true,
							message: `
								If the node subtree is large, this could take a long time. You can view the progress in the progress label below the start button.
							`.AsMultiline(0),
							onOK: async()=>{
								setState(prev=>({...prev, serverImportInProgress: true, serverImport_commandsCompleted: 0}));
								try {
									const result = await PerformBatchOperation_SetNodeAccessPolicies(nodesRetrieved_filtered, newPolicy!, subcommandsCompleted=>{
										setState(prev=>({...prev, serverImport_commandsCompleted: subcommandsCompleted}));
									});
									ShowMessageBox({
										title: "Batch operation succeeded",
										message: `Batch operation has completed. Commands in batch completed: ${result.results.length ?? 0}`,
									});
								} catch (ex) {
									ShowMessageBox({
										title: `Batch operation failed`,
										message: `Batch operation has failed (no changes *should* have been persisted). Error details: ${ex}`,
									});
								}
								setState(prev=>({
									retrievalActive: false, // also reset retrieval-active to false (so that UI doesn't show the stale retrieval results anymore)
									serverImportInProgress: false,
									serverImport_commandsCompleted: 0,
								}))
							},
						});
					}}/>
			</Row>
			{serverImportInProgress &&
			<Row>
				Progress: {serverImport_commandsCompleted}/{nodesRetrieved_filtered.length}
			</Row>}
		</Column>
	);
});

async function PerformBatchOperation_SetNodeAccessPolicies(nodes: NodeL1[], newAccessPolicy: AccessPolicy, onProgress: (subcommandsCompleted: number)=>void) {
	const commandEntries = nodes.map(node=>{
		return {
			updateNode: {
				id: node.id,
				updates: {accessPolicy: newAccessPolicy.id},
			},
		} as CommandEntry;
	});

	return await RunCommandBatch(commandEntries, onProgress);
}

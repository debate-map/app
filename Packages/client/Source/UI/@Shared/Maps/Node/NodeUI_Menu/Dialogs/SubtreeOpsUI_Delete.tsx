import {store} from "Store";
import React, {useState} from "react";
import {Button, CheckBox, Column, Row, RowLR, Spinner, Text} from "react-vcomponents";
import {InfoButton, RunInAction_Set} from "web-vcore";
import {E} from "js-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {gql, useQuery} from "@apollo/client";
import {MI_SharedProps} from "../../NodeUI_Menu.js";
import {PolicyPicker_Button} from "../../../../../Database/Policies/PolicyPicker.js";
import {RunCommand_DeleteSubtree} from "../../../../../../Utils/DB/Command.js";
import {UserPicker_Button} from "../../../../Users/UserPicker.js";
import {observer_mgl} from "mobx-graphlink";

const splitAt = 150;

export const SubtreeOpsUI_Delete_Left = (props: MI_SharedProps)=>{
	const dialogState = store.main.maps.subtreeOperationsDialog;

	return (
		<>
			<RowLR mt={5} splitAt={splitAt}>
				<Row center>
					<Text>Deletion depth:</Text>
					<InfoButton ml={5} text={`This value is automatically set to the retrieval max-depth (set above). [they need to match for the previewing/checking to work]`}/>
				</Row>
				<Spinner ml={5} min={0} max={30} enabled={false} value={dialogState.maxExportDepth} onChange={val=>RunInAction_Set(()=>dialogState.maxExportDepth = val)}/>
			</RowLR>
		</>
	);
}

type SubtreeOpsUI_Delete_Right_State = {
	retrievalActive: boolean,
	serverOpInProgress: boolean,
	serverOp_commandsCompleted: number,
	serverOp_commandsTotal: number
}

export const SubtreeOpsUI_Delete_Right = observer_mgl((props: MI_SharedProps)=>{
	const {mapID, node: rootNode} = props;
	const [{retrievalActive, serverOpInProgress, serverOp_commandsCompleted, serverOp_commandsTotal}, setState] = useState<SubtreeOpsUI_Delete_Right_State>({
		retrievalActive: false,
		serverOpInProgress: false,
		serverOp_commandsCompleted: 0,
		serverOp_commandsTotal: 0,
	});

	const dialogState = store.main.maps.subtreeOperationsDialog;

	// todo: if this fails authentication, use query-fetching approach seen in Admin.tsx for db-backups
	const {data} = useQuery(gql`
		query($input: DeleteSubtreeInput!) {
			getPreparedDataForDeletingSubtree(input: $input) {
				subcommandCount
				nodesToUnlinkIds
				nodesToDeleteIds
				nodesToDeleteAccessPolicies
				nodesToDeleteCreatorIds
				nodesToDeleteCreationTimes
			}
		}
	`, {
		variables: {input: {mapId: mapID, rootNodeId: rootNode.id, maxDepth: dialogState.maxExportDepth}},
		skip: !retrievalActive,
		// not sure if these are needed
		fetchPolicy: "no-cache",
		nextFetchPolicy: "no-cache",
	});

	const prep_raw = data?.getPreparedDataForDeletingSubtree as {
		subcommandCount: number;
		nodesToUnlinkIds: string[],
		nodesToDeleteIds: string[],
		nodesToDeleteAccessPolicies: {[key: string]: number},
		nodesToDeleteCreatorIds: {[key: string]: number},
		nodesToDeleteCreationTimes: number[],
	};
	const prep = prep_raw ?? {subcommandCount: 0, nodesToUnlinkIds: [], nodesToDeleteIds: [], nodesToDeleteAccessPolicies: {}, nodesToDeleteCreatorIds: {}, nodesToDeleteCreationTimes: []};
	const nodesToAffect = prep.nodesToUnlinkIds.length + prep.nodesToDeleteIds.length;

	const datesOfNodesToDelete = prep.nodesToDeleteCreationTimes.map(a=>new Date(a).toLocaleString("sv").split(" ")[0]).Distinct();
	const datesOfNodesToDelete_matches = datesOfNodesToDelete.ToMap(dateStr=>dateStr, dateStr=>prep.nodesToDeleteCreationTimes.filter(a=>new Date(a).toLocaleString("sv").split(" ")[0] == dateStr).length ?? 0);

	const Header = (p: {children: React.ReactNode})=><Row mt={20} style={{fontSize: 16, fontWeight: "bold"}}>{p.children}</Row>;
	return (
		<Column style={{flex: 1}}>
			<Row>
				<CheckBox enabled={!serverOpInProgress} text={`Start retrieval${nodesToAffect > 0 ? ` (nodes to affect: ${nodesToAffect})` : ""}`}
					value={retrievalActive} onChange={val=>{
						setState(prev=>({...prev, retrievalActive: val}));
					}}/>
				<Row ml="auto"></Row>
			</Row>
			<div style={{marginTop: 5}}>
				<span style={{display: "inline", whiteSpace: "pre", fontWeight: "bold"}}>Note:</span>
				<Text style={{display: "inline", whiteSpace: "pre-wrap"}}> This operation will only delete nodes/subtrees that have no other parent. If a node is encountered with more than one parent, it will merely be unlinked, rather than deleted.</Text>
			</div>

			<Header>Preview</Header>
			<Row>
				<Text style={{fontWeight: "bold"}}>Nodes to delete: {prep.nodesToDeleteIds.length}</Text>
			</Row>
			<Row>
				<Text style={{fontWeight: "bold"}}>Nodes to unlink: {prep.nodesToUnlinkIds.length}</Text>
			</Row>
			<Column mt={5}>
				<Text>Access-policies of nodes to delete:</Text>
				<Column>
					{Object.entries(prep.nodesToDeleteAccessPolicies).OrderByDescending(([policyID, count])=>count).map(([policyID, count])=>{
						//return <div key={policyID} style={E(filterEntry_styleBase)}>{policyID} [{accessPoliciesInSubtree_matches.get(policyID)}]</div>;
						return <Row key={policyID} mt={5}>
							<PolicyPicker_Button policyID={policyID} idTrimLength={3} enabled={true} style={E(
								{flex: 1, padding: "3px 10px", pointerEvents: "none"},
								//{background: Button_styles.root.backgroundColor},
								{background: "rgba(30,100,30,.5)"},
							)}/>
							<Text ml={5} style={{minWidth: 100, justifyContent: "center", fontSize: 13}}>({count} matches)</Text>
						</Row>;
					})}
				</Column>
			</Column>
			<Column mt={5}>
				<Text>Creators of nodes to delete:</Text>
				<Column>
					{Object.entries(prep.nodesToDeleteCreatorIds).OrderByDescending(([userID, count])=>count).map(([userID, count])=>{
						//return <div key={policyID} style={E(filterEntry_styleBase)}>{policyID} [{accessPoliciesInSubtree_matches.get(policyID)}]</div>;
						return <Row key={userID} mt={5}>
							<UserPicker_Button userID={userID} idTrimLength={3} enabled={true} style={E(
								{flex: 1, padding: "3px 10px", pointerEvents: "none"},
								//{background: Button_styles.root.backgroundColor},
								{background: "rgba(30,100,30,.5)"},
							)}/>
							<Text ml={5} style={{minWidth: 100, justifyContent: "center", fontSize: 13}}>({count} matches)</Text>
						</Row>;
					})}
				</Column>
			</Column>
			<Column mt={5}>
				<Text>Creation dates of nodes to delete:</Text>
				<Row style={{flexWrap: "wrap", gap: 5}}>
					{datesOfNodesToDelete.OrderByDescending(dateStr=>datesOfNodesToDelete_matches.get(dateStr)).map(dateStr=>{
						return (
							<Button key={dateStr} enabled={true} text={`${dateStr} (${datesOfNodesToDelete_matches.get(dateStr)})`} style={E(
								{padding: "3px 10px", pointerEvents: "none"},
								//{background: Button_styles.root.backgroundColor},
								{background: "rgba(30,100,30,.5)"},
							)}/>
						);
					})}
				</Row>
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
				<Button enabled={nodesToAffect > 0 && !serverOpInProgress} style={{flex: 1}}
					text={`Start batch deletion of node subtree (affecting ${prep.nodesToDeleteIds.length}+${prep.nodesToUnlinkIds.length} nodes)`}
					onClick={()=>{
						ShowMessageBox({
							title: `Start batch operation on ${prep.nodesToDeleteIds.length}+${prep.nodesToUnlinkIds.length} nodes?`, cancelButton: true,
							message: `If the node subtree is large, this could take a long time. You can view the progress in the progress label below the start button.`,
							onOK: async()=>{
								setState(prev=>({...prev, serverOpInProgress: true, serverOp_commandsCompleted: 0, serverOp_commandsTotal: 0}));
								try {
									const result = await RunCommand_DeleteSubtree({mapId: mapID, rootNodeId: rootNode.id, maxDepth: dialogState.maxExportDepth}, (subcommandsCompleted, subcommandsTotal)=>{
										setState(prev=>({...prev, serverOp_commandsCompleted: subcommandsCompleted, serverOp_commandsTotal: subcommandsTotal}));
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
								setState({
									retrievalActive: false, // also reset retrieval-active to false (so that UI doesn't show the stale retrieval results anymore)
									serverOpInProgress: false,
									serverOp_commandsCompleted: 0,
									serverOp_commandsTotal: 0,
								});
							},
						});
					}}/>
			</Row>
			{serverOpInProgress &&
			<Row>
				Progress: {serverOp_commandsCompleted}/{serverOp_commandsTotal}
			</Row>}
		</Column>
	);
})

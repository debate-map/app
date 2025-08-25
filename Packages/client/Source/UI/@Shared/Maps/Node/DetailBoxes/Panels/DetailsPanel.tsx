import {Button, Column, Row} from "react-vcomponents";
import {AddGlobalStyle} from "react-vextensions";
import {RunInAction} from "web-vcore";
import {store} from "Store";
import _ from "lodash";
import {NodeL3, GetParentNodeL3, GetLinkUnderParent, MeID, DMap, HasModPermissions, AsNodeRevisionInput, PERMISSIONS} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {gql} from "@apollo/client";
import {RunCommand_AddNodeRevision} from "Utils/DB/Command.js";
import {NodeDetailsUI, NodeDetailsUIElem} from "../../NodeDetailsUI.js";
import {SLMode_SFI} from "../../../../../@SL/SL.js";
import {observer_mgl} from "mobx-graphlink";
import {useRef, useState} from "react";
import React from "react";

AddGlobalStyle(`
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
`);

export type DetailsPanel_Props = {
	show: boolean,
	map?: DMap|n,
	node: NodeL3,
	path: string
};

type DetailsPanel_State = {
	dataError: string|n,
	saveState: "idle" | "saving" | "success" | "error"
};

export const DetailsPanel = observer_mgl((props: DetailsPanel_Props)=>{
	const {show, map, node, path} = props;

	const [state, setState] = useState<DetailsPanel_State>({
		dataError: null,
		saveState: "idle",
	});
	const detailsUIRref = useRef<NodeDetailsUIElem>(null);

	const parentNode = GetParentNodeL3(path);
	const link = GetLinkUnderParent(node.id, parentNode);

	if (path.includes("/") && parentNode == null) return null;

	const canEdit = PERMISSIONS.Node.Modify(MeID(), node);

	return (
		<Column style={{position: "relative", display: show ? null : "none"}}>
			<NodeDetailsUI ref={detailsUIRref} map={map} parent={parentNode} baseData={node} baseRevisionData={node.current}
				baseLinkData={link} forNew={false} enabled={canEdit} onChange={()=>{
					setState(prevState=>({
						...prevState,
						dataError: detailsUIRref.current!.getValidationError(),
					}));
				}}
			/>

			{canEdit &&
				<Row>
					<Button text="Save" enabled={state.dataError == null} title={state.dataError} onLeftClick={async()=>{
						setState(prevState=>({...prevState, saveState: "saving"}));

						const newRevision = detailsUIRref.current!.getNewRevisionData();
						const {id: revisionID} = await RunCommand_AddNodeRevision({mapID: map?.id, revision: AsNodeRevisionInput(newRevision)});
						RunInAction("DetailsPanel.save.onClick", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now()));
						setState(prevState=>({...prevState, saveState: "success"}));
					}}/>
					<div style={{
						display: "flex", alignItems: "center", paddingLeft: "0.5rem",
					}}>
						{state.saveState === "saving" && <span style={{animation: "spin 1s linear infinite"}} className="mdi mdi-loading"/>}
						{state.saveState === "success" && <span style={{color: "rgba(0,255,0,1)"}} className="mdi mdi-check"/>}
						{state.saveState === "error" && <span style={{color: "red"}} className="mdi mdi-alert-circle"/>}
					</div>
					{HasModPermissions(MeID()) && !SLMode_SFI &&
					<Button ml="auto" text="Force refresh" onClick={async()=>{
						const result = await apolloClient.mutate({
							mutation: gql`
								mutation($payload: JSON!) {
									refreshLQData(payload: $payload) {
										message
									}
								}
							`,
							variables: {
								payload: {
									collection: "nodes",
									entryID: node.id,
								},
							},
						});
						console.log("Force-refresh-node result:", result);
					}}/>}
				</Row>}
		</Column>
	);
});

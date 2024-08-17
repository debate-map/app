import {Button, Column, Pre, Row} from "react-vcomponents";
import {AddGlobalStyle, BaseComponentPlus} from "react-vextensions";
import {GetUpdates, Observer, RunInAction} from "web-vcore";
import {store} from "Store";
import {runInAction} from "mobx";
import {E, ToJSON, Clone, CE} from "js-vextensions";
import {GetAsync} from "mobx-graphlink";
import _ from "lodash";
import {NodeL3, GetParentNodeL3, GetParentNodeID, GetLinkUnderParent, GetUser, MeID, IsUserCreatorOrMod, PermissionInfoType, UpdateLink, AddNodeRevision, DMap, HasModPermissions, HasAdminPermissions, AsNodeRevisionInput} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {gql} from "@apollo/client";
import {RunCommand_AddNodeRevision} from "Utils/DB/Command.js";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";
import {SLMode_SFI} from "../../../../../@SL/SL.js";

AddGlobalStyle(`
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
`);

@Observer
export class DetailsPanel extends BaseComponentPlus({} as {show: boolean, map?: DMap|n, node: NodeL3, path: string}, {dataError: null as string|n, saveState: "idle" as "idle" | "saving" | "success" | "error"}) {
	detailsUI: NodeDetailsUI|n;
	render() {
		const {show, map, node, path} = this.props;
		const {dataError, saveState} = this.state;

		const parentNode = GetParentNodeL3(path);
		const link = GetLinkUnderParent(node.id, parentNode);
		const creator = GetUser(node.creator);

		//const isSubnode = IsNodeSubnode(node);

		// if parent-node not loaded yet, don't render yet
		if (/*!isSubnode &&*/ path.includes("/") && parentNode == null) return null;

		// const creatorOrMod = IsUserCreatorOrMod(MeID(), node);
		//const canEdit = CanSubmitRevisions(MeID(), node.id);
		const canEdit = IsUserCreatorOrMod(MeID(), node); // temp
		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				<NodeDetailsUI ref={c=>this.detailsUI = c} map={map} parent={parentNode}
					baseData={node} baseRevisionData={node.current} baseLinkData={link}
					forNew={false} enabled={canEdit}
					onChange={(newData, newRevisionData, newLinkData, comp)=>{
						/*if (map?.requireMapEditorsCanEdit) {
							comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.mapEditors};
						}*/
						this.SetState({dataError: this.detailsUI!.GetValidationError()});
					}}/>
				{canEdit &&
					<Row>
						<Button text="Save" enabled={dataError == null} title={dataError} onLeftClick={async()=>{
							this.SetState({saveState: "saving"});
							// let nodeUpdates = GetUpdates(node, this.detailsUI.GetNewData()).ExcludeKeys("parents", "children", "layerPlusAnchorParents", "finalType", "link");
							/*if (link) {
								const linkUpdates = GetUpdates(link, this.detailsUI!.GetNewLinkData());
								if (linkUpdates.VKeys().length) {
									await new UpdateLink(E({linkID: link.id, linkUpdates})).RunOnServer();
								}
							}*/

							const newRevision = this.detailsUI!.GetNewRevisionData();
							//const revisionID = await new AddNodeRevision({mapID: map?.id, revision: newRevision}).RunOnServer();
							const {id: revisionID} = await RunCommand_AddNodeRevision({mapID: map?.id, revision: AsNodeRevisionInput(newRevision)});
							RunInAction("DetailsPanel.save.onClick", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now()));
							this.SetState({saveState: "success"});
						}}/>
						<div style={{
							display: "flex", alignItems: "center", paddingLeft: "0.5rem",
						}}>
							{saveState === "saving" && <span style={{animation: "spin 1s linear infinite"}} className="mdi mdi-loading"/>}
							{saveState === "success" && <span style={{color: "rgba(0,255,0,1)"}} className="mdi mdi-check"/>}
							{saveState === "error" && <span style={{color: "red"}} className="mdi mdi-alert-circle"/>}
						</div>
						{/* error && <Pre>{error.message}</Pre> */}
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
	}
}
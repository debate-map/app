import {Button, Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GetUpdates, Observer, RunInAction} from "web-vcore";
import {store} from "Store";
import {runInAction} from "web-vcore/nm/mobx.js";
import {E, ToJSON, Clone, CE} from "web-vcore/nm/js-vextensions.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import _ from "lodash";
import {NodeL3, GetParentNodeL3, GetParentNodeID, GetLinkUnderParent, GetUser, MeID, IsUserCreatorOrMod, PermissionInfoType, UpdateLink, AddNodeRevision, Map, HasModPermissions, HasAdminPermissions, AsNodeRevisionInput} from "dm_common";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {gql} from "web-vcore/nm/@apollo/client";
import {RunCommand_AddNodeRevision} from "Utils/DB/Command.js";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";

@Observer
export class DetailsPanel extends BaseComponentPlus({} as {show: boolean, map?: Map|n, node: NodeL3, path: string}, {dataError: null as string|n}) {
	detailsUI: NodeDetailsUI|n;
	render() {
		const {show, map, node, path} = this.props;
		const {dataError} = this.state;

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
						}}/>
						{/* error && <Pre>{error.message}</Pre> */}
						{HasModPermissions(MeID()) &&
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
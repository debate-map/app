import {Button, Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GetUpdates} from "web-vcore";
import {store} from "Store";
import {runInAction} from "web-vcore/nm/mobx.js";
import {E, ToJSON, Clone} from "web-vcore/nm/js-vextensions.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import _ from "lodash";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";
import {MapNodeL3} from "dm_common";
import {GetParentNodeL3, GetParentNodeID} from "dm_common";
import {GetLinkUnderParent, IsPremiseOfSinglePremiseArgument} from "dm_common";
import {GetUser, MeID} from "dm_common";
import {IsUserCreatorOrMod} from "dm_common";
import {PermissionInfoType} from "dm_common";
import {UpdateLink} from "dm_common";
import {AddNodeRevision} from "dm_common";
import {Map} from "dm_common";

export class DetailsPanel extends BaseComponentPlus({} as {show: boolean, map?: Map, node: MapNodeL3, path: string}, {dataError: null as string|n}) {
	detailsUI: NodeDetailsUI|n;
	render() {
		const {show, map, node, path} = this.props;
		const {dataError} = this.state;

		const parentNode = GetParentNodeL3.NN(path);
		const link = GetLinkUnderParent.NN(node.id, parentNode);
		const creator = GetUser(node.creator);

		//const isSubnode = IsNodeSubnode(node);

		// if parent-node not loaded yet, don't render yet
		if (/*!isSubnode &&*/ path.includes("/") && parentNode == null) return null;

		// const creatorOrMod = IsUserCreatorOrMod(MeID(), node);
		//const canEdit = CanSubmitRevisions(MeID(), node.id);
		const canEdit = IsUserCreatorOrMod(MeID(), node); // temp
		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				<NodeDetailsUI ref={c=>this.detailsUI = c}
					baseData={node} baseRevisionData={node.current} baseLinkData={link} parent={parentNode}
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
							// let nodeUpdates = GetUpdates(node, this.detailsUI.GetNewData()).Excluding("parents", "children", "layerPlusAnchorParents", "finalType", "link");
							if (link) {
								const linkUpdates = GetUpdates(link, this.detailsUI!.GetNewLinkData());
								if (linkUpdates.VKeys().length) {
									await new UpdateLink(E({linkID: link.id, linkUpdates})).Run();
								}
							}

							const newRevision = this.detailsUI!.GetNewRevisionData();
							const revisionID = await new AddNodeRevision({mapID: map?.id, revision: newRevision}).Run();
							runInAction("DetailsPanel.save.onClick", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now()));

							/*if (IsPremiseOfSinglePremiseArgument(node, parentNode)) {
								const argumentNode = await GetAsync(()=>GetParentNodeL3(path));
								if (IsUserCreatorOrMod(MeID(), argumentNode)) {
									const permissionKeys = ["accessLevel", "votingDisabled", /* "permission_edit", *#/ "permission_contribute"] as const;
									const nodePermissions = newRevision.Including(...permissionKeys);
									const argumentNodePermissions = argumentNode.current.Including(...permissionKeys);
									// if argument permissions do not match premise, update argument's permissions to match
									if (!_.isEqual(argumentNodePermissions, nodePermissions)) {
										const newArgumentRevision = Clone(argumentNode.current);
										newArgumentRevision.VSet(nodePermissions);
										const newArgumentRevisionID = await new AddNodeRevision({mapID: map.id, revision: newArgumentRevision}).Run();
										runInAction("DetailsPanel.save.onClick_part2", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentNode.id, Date.now()));
									}
								}
							}*/
						}}/>
						{/* error && <Pre>{error.message}</Pre> */}
					</Row>}
			</Column>
		);
	}
}
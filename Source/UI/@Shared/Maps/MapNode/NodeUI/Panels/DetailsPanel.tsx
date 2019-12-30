import {Button, Column, Row} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {GetUpdates} from "vwebapp-framework";
import {store} from "Store";
import {runInAction} from "mobx";
import {E, ToJSON, Clone} from "js-vextensions";
import {GetAsync} from "mobx-firelink";
import _ from "lodash";
import {PermissionInfoType} from "Store/firebase/nodes/@MapNodeRevision";
import {AddNodeRevision} from "../../../../../../Server/Commands/AddNodeRevision";
import {UpdateLink} from "../../../../../../Server/Commands/UpdateLink";
import {Map} from "../../../../../../Store/firebase/maps/@Map";
import {GetParentNodeID, GetParentNodeL3, IsNodeSubnode} from "../../../../../../Store/firebase/nodes";
import {GetLinkUnderParent, IsPremiseOfSinglePremiseArgument} from "../../../../../../Store/firebase/nodes/$node";
import {MapNodeL3} from "../../../../../../Store/firebase/nodes/@MapNode";
import {IsUserCreatorOrMod} from "../../../../../../Store/firebase/userExtras";
import {GetUser, MeID, CanEditNode} from "../../../../../../Store/firebase/users";
import {NodeDetailsUI} from "../../NodeDetailsUI";

export class DetailsPanel extends BaseComponentPlus({} as {map?: Map, node: MapNodeL3, path: string}, {dataError: null as string}) {
	detailsUI: NodeDetailsUI;
	render() {
		const {map, node, path} = this.props;
		const {dataError} = this.state;

		const parentNode = GetParentNodeL3(path);
		const link = GetLinkUnderParent(node._key, parentNode);
		const creator = GetUser(node.creator);

		const isSubnode = IsNodeSubnode(node);

		// if parent-node not loaded yet, don't render yet
		if (!isSubnode && path.includes("/") && parentNode == null) return null;

		// const creatorOrMod = IsUserCreatorOrMod(MeID(), node);
		const canEdit = CanEditNode(MeID(), node._key);
		return (
			<Column style={{position: "relative"}}>
				<NodeDetailsUI ref={c=>this.detailsUI = c}
					baseData={node} baseRevisionData={node.current} baseLinkData={link} parent={parentNode}
					forNew={false} enabled={canEdit}
					onChange={(newData, newRevisionData, newLinkData, comp)=>{
						if (map?.requireMapEditorsCanEdit) {
							comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.MapEditors};
						}
						this.SetState({dataError: this.detailsUI.GetValidationError()});
					}}/>
				{canEdit &&
					<Row>
						<Button text="Save" enabled={dataError == null} onLeftClick={async()=>{
							// let nodeUpdates = GetUpdates(node, this.detailsUI.GetNewData()).Excluding("parents", "children", "layerPlusAnchorParents", "finalType", "link");
							if (link) {
								const linkUpdates = GetUpdates(link, this.detailsUI.GetNewLinkData());
								if (linkUpdates.VKeys(true).length) {
									await new UpdateLink(E({linkParentID: GetParentNodeID(path), linkChildID: node._key, linkUpdates})).Run();
								}
							}

							const newRevision = this.detailsUI.GetNewRevisionData();
							const revisionID = await new AddNodeRevision({mapID: map._key, revision: newRevision}).Run();
							runInAction("DetailsPanel.save.onClick", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(node._key, Date.now()));

							if (IsPremiseOfSinglePremiseArgument(node, parentNode)) {
								const argumentNode = await GetAsync(()=>GetParentNodeL3(path));
								if (IsUserCreatorOrMod(MeID(), argumentNode)) {
									const permissionKeys = ["accessLevel", "votingDisabled", /* "permission_edit", */ "permission_contribute"] as const;
									const nodePermissions = newRevision.Including(...permissionKeys);
									const argumentNodePermissions = argumentNode.current.Including(...permissionKeys);
									// if argument permissions do not match premise, update argument's permissions to match
									if (!_.isEqual(argumentNodePermissions, nodePermissions)) {
										const newArgumentRevision = Clone(argumentNode.current);
										newArgumentRevision.VSet(nodePermissions);
										const newArgumentRevisionID = await new AddNodeRevision({mapID: map._key, revision: newArgumentRevision}).Run();
										runInAction("DetailsPanel.save.onClick_part2", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentNode._key, Date.now()));
									}
								}
							}
						}}/>
						{/* error && <Pre>{error.message}</Pre> */}
					</Row>}
			</Column>
		);
	}
}
import {Button, Column, Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {GetUpdates} from "vwebapp-framework";
import {store} from "Store";
import {runInAction} from "web-vcore/nm/mobx";
import {E, ToJSON, Clone} from "web-vcore/nm/js-vextensions";
import {GetAsync} from "web-vcore/nm/mobx-graphlink";
import _ from "lodash";
import {NodeDetailsUI} from "../../NodeDetailsUI";
import {MapNodeL3} from "@debate-map/server-link/Source/Link";
import {GetParentNodeL3, IsNodeSubnode, GetParentNodeID} from "@debate-map/server-link/Source/Link";
import {GetLinkUnderParent, IsPremiseOfSinglePremiseArgument} from "@debate-map/server-link/Source/Link";
import {GetUser, MeID} from "@debate-map/server-link/Source/Link";
import {CanEditNode, IsUserCreatorOrMod} from "@debate-map/server-link/Source/Link";
import {PermissionInfoType} from "@debate-map/server-link/Source/Link";
import {UpdateLink} from "@debate-map/server-link/Source/Link";
import {AddNodeRevision} from "@debate-map/server-link/Source/Link";
import {Map} from "@debate-map/server-link/Source/Link";

export class DetailsPanel extends BaseComponentPlus({} as {show: boolean, map?: Map, node: MapNodeL3, path: string}, {dataError: null as string}) {
	detailsUI: NodeDetailsUI;
	render() {
		const {show, map, node, path} = this.props;
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
			<Column style={{position: "relative", display: show ? null : "none"}}>
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
						<Button text="Save" enabled={dataError == null} title={dataError} onLeftClick={async()=>{
							// let nodeUpdates = GetUpdates(node, this.detailsUI.GetNewData()).Excluding("parents", "children", "layerPlusAnchorParents", "finalType", "link");
							if (link) {
								const linkUpdates = GetUpdates(link, this.detailsUI.GetNewLinkData());
								if (linkUpdates.VKeys().length) {
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
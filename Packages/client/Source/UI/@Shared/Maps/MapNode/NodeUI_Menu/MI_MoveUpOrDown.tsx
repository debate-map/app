import {AddChildNode, ChildGroup, ChildOrdering, CullMapNodePhrasingToBeEmbedded, GetChildOrdering_Final, GetMap, GetNode, GetNodeChildLinks, GetNodeChildrenL2, GetNodeDisplayText, GetNodeL2, GetNodeL3, GetParentNode, GetParentNodeID, GetParentNodeL2, GetParentPath, HasAdminPermissions, IsPremiseOfSinglePremiseArgument, IsUserCreatorOrAdmin, IsUserCreatorOrMod, LexoRank, MapNode, MapNodeL3, MapNodePhrasing, MapNodeRevision, MapNodeType, MeID, NodeChildLink, Polarity, SourceType, systemUserID, UpdateLink} from "dm_common";
import React, {ComponentProps} from "react";
import {store} from "Store";
import {CSV_SL_Row} from "Utils/DataFormats/CSV/CSV_SL/DataModel.js";
import {GetResourcesInImportSubtree_CSV_SL} from "Utils/DataFormats/CSV/CSV_SL/ImportHelpers.js";
import {DataExchangeFormat, ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat.js";
import {FS_MapNodeL3} from "Utils/DataFormats/JSON/DM_Old/FSDataModel/FS_MapNode.js";
import {GetResourcesInImportSubtree} from "Utils/DataFormats/JSON/DM_Old/FSImportHelpers.js";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {ES, InfoButton, O, Observer, RunInAction_Set} from "web-vcore";
import {gql} from "web-vcore/nm/@apollo/client";
import {E, FromJSON, GetEntries, ModifyString, Timer} from "web-vcore/nm/js-vextensions.js";
import {makeObservable} from "web-vcore/nm/mobx";
import {ignore} from "web-vcore/nm/mobx-sync";
import {Button, CheckBox, Column, Row, Select, Spinner, Text, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {parseString, RowMap} from "@fast-csv/parse";
import ReactList from "react-list";
import {GetOpenMapID} from "Store/main.js";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";
import {Command, CreateAccessor, GetAsync} from "mobx-graphlink";
import {AddNotificationMessage} from "Store/main/@NotificationMessage.js";
import {MAX_TIMEOUT_DURATION} from "ui-debug-kit";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_MoveUpOrDown extends BaseComponent<MI_SharedProps & {direction: "up" | "down"}, {}, ImportResource> {
	//lastController: BoxController;
	render() {
		const {direction, map, node, path, childGroup} = this.props;

		const parentPath = GetParentPath(path);
		const parentNode = GetNodeL3(parentPath);
		const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parentNode);
		const nodeToMove_path = isPremiseOfSinglePremiseArg ? parentPath : path;
		const nodeToMove = isPremiseOfSinglePremiseArg ? parentNode : node;
		if (nodeToMove == null) return null;

		const orderingParentID = GetParentNodeID(nodeToMove_path);
		const orderingParent = GetNodeL2(orderingParentID);
		const orderingParent_childOrdering = orderingParent?.current ? GetChildOrdering_Final(orderingParent?.current, map, store.main.maps.childOrdering) : null;
		const orderingParent_childLinks_ordered = GetNodeChildLinks(orderingParentID);
		const ownIndexAmongPeers = orderingParent_childLinks_ordered.findIndex(a=>a.child == nodeToMove.id);
		if (ownIndexAmongPeers == -1) return null; // defensive; this shouldn't happen, but if it does, cancel rendering until data resolves properly

		let towardMin = direction == "up";
		const directionInDataIsOpposite = nodeToMove.link?.polarity == Polarity.supporting && nodeToMove.link?.group != ChildGroup.freeform;
		if (directionInDataIsOpposite) towardMin = !towardMin;

		// todo: make-so this jumping occurs relative to only the peers in the same rendered-child-group (though might be full list, eg. if "flat" view is used)

		const orderKeyToJumpPast = orderingParent_childLinks_ordered[ownIndexAmongPeers + (towardMin ? -1 : 1)]?.orderKey;
		let newOrderKey: string|n;
		//let error: string|n;
		if (orderKeyToJumpPast != null) {
			const orderKeyToJumpTo = orderingParent_childLinks_ordered[ownIndexAmongPeers + (towardMin ? -2 : 2)]?.orderKey;
			const jumpPast = LexoRank.parse(orderKeyToJumpPast);
			if (orderKeyToJumpTo) {
				const jumpTo = LexoRank.parse(orderKeyToJumpTo);
				if (jumpPast.equals(jumpTo)) {
					newOrderKey = towardMin ? jumpPast.genPrev().toString() : jumpPast.genNext().toString();
				} else {
					//newOrderKey = LexoRank.between(jumpPast.decimal, LexoRank.parse(orderKeyToJumpTo));
					newOrderKey = jumpPast.between(LexoRank.parse(orderKeyToJumpTo)).toString();
				}
			} else {
				newOrderKey = towardMin ? jumpPast.genPrev().toString() : jumpPast.genNext().toString();
			}
			/*} catch (ex) {
				console.error(ex);
				error = ex;
			}*/
		}

		return (
			<VMenuItem text={`Move ${direction}`} style={liveSkin.Style_VMenuItem()}
				enabled={Boolean(nodeToMove.link && IsUserCreatorOrMod(MeID(), nodeToMove.link) && orderingParent_childOrdering == ChildOrdering.manual && newOrderKey != null)}
				//title={error ? `Error calculating new order-key: ${error}` : undefined}
				onClick={async e=>{
					if (e.button != 0) return;
					new UpdateLink({
						linkID: nodeToMove.link!.id,
						linkUpdates: {orderKey: newOrderKey!},
					}).RunOnServer();
				}}/>
		);
	}
}
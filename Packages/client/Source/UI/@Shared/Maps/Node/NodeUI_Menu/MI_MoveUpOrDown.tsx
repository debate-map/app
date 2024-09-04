import {ChildGroup, ChildOrdering, GetChildOrdering_Final, GetNodeLinks, GetNodeL2, GetNodeL3, GetParentNodeID, GetParentPath, IsUserCreatorOrMod, MeID, Polarity, UpdateLink, OrderKey, PERMISSIONS} from "dm_common";
import React from "react";
import {store} from "Store";
import {ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {RunCommand_UpdateNodeLink} from "Utils/DB/Command.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {Observer} from "web-vcore";
import {BaseComponent} from "react-vextensions";
import {VMenuItem} from "react-vmenu";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_MoveUpOrDown extends BaseComponent<MI_SharedProps & {direction: "up" | "down"}, {}, ImportResource> {
	//lastController: BoxController;
	render() {
		const {direction, map, node, path} = this.props;
		const childGroup = node.link?.group;
		if (map == null || childGroup == null) return null;

		const orderingParentID = GetParentNodeID(path);
		if (orderingParentID == null) return null;
		const orderingParent = GetNodeL2(orderingParentID);
		const orderingParent_childOrdering = orderingParent?.current ? GetChildOrdering_Final(orderingParent, childGroup, map, store.main.maps.childOrdering) : null;
		const orderingParent_childLinks_ordered = GetNodeLinks(orderingParentID);
		const ownIndexAmongPeers = orderingParent_childLinks_ordered.findIndex(a=>a.child == node.id);
		if (ownIndexAmongPeers == -1) return null; // defensive; this shouldn't happen, but if it does, cancel rendering until data resolves properly

		let towardMin = direction == "up";
		const directionInDataIsOpposite = node.link?.polarity == Polarity.supporting && node.link?.group != ChildGroup.freeform; // todo: make sure this is correct
		if (directionInDataIsOpposite) towardMin = !towardMin;

		// todo: make-so this jumping occurs relative to only the peers in the same rendered-child-group (though might be full list, eg. if "flat" view is used)

		const orderKeyToJumpPast = orderingParent_childLinks_ordered[ownIndexAmongPeers + (towardMin ? -1 : 1)]?.orderKey;
		let newOrderKey: string|n;
		//let error: string|n;
		if (orderKeyToJumpPast != null) {
			const orderKeyToJumpTo = orderingParent_childLinks_ordered[ownIndexAmongPeers + (towardMin ? -2 : 2)]?.orderKey;
			const jumpPast = new OrderKey(orderKeyToJumpPast);
			if (orderKeyToJumpTo) {
				const jumpTo = new OrderKey(orderKeyToJumpTo);
				if (jumpPast.key == jumpTo.key) {
					newOrderKey = towardMin ? jumpPast.prev().key : jumpPast.next().key;
				} else {
					//newOrderKey = VLexoRank.between(jumpPast.decimal, VLexoRank.parse(orderKeyToJumpTo));
					newOrderKey = jumpPast.between(new OrderKey(orderKeyToJumpTo)).key;
				}
			} else {
				newOrderKey = towardMin ? jumpPast.prev().key : jumpPast.next().key;
			}
			/*} catch (ex) {
				console.error(ex);
				error = ex;
			}*/
		}

		return (
			<VMenuItem text={`Move ${direction}`} style={liveSkin.Style_VMenuItem()}
				enabled={Boolean(node.link && PERMISSIONS.NodeLink.Modify(MeID(), node.link) && orderingParent_childOrdering == ChildOrdering.manual && newOrderKey != null)}
				//title={error ? `Error calculating new order-key: ${error}` : undefined}
				onClick={async e=>{
					if (e.button != 0) return;
					/*new UpdateLink({
						linkID: node.link!.id,
						linkUpdates: {orderKey: newOrderKey!},
					}).RunOnServer();*/
					await RunCommand_UpdateNodeLink({id: node.link!.id, updates: {orderKey: newOrderKey!}});
				}}/>
		);
	}
}
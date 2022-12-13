import {ChildGroup, ChildOrdering, GetChildOrdering_Final, GetNodeChildLinks, GetNodeL2, GetNodeL3, GetParentNodeID, GetParentPath, IsPremiseOfSinglePremiseArgument, IsUserCreatorOrMod, VLexoRank, MeID, Polarity, UpdateLink} from "dm_common";
import React from "react";
import {store} from "Store";
import {ImportResource} from "Utils/DataFormats/DataExchangeFormat.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {Observer} from "web-vcore";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
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
			const jumpPast = VLexoRank.parse(orderKeyToJumpPast);
			if (orderKeyToJumpTo) {
				const jumpTo = VLexoRank.parse(orderKeyToJumpTo);
				if (jumpPast.equals(jumpTo)) {
					newOrderKey = towardMin ? jumpPast.genPrev().toString() : jumpPast.genNext().toString();
				} else {
					//newOrderKey = VLexoRank.between(jumpPast.decimal, VLexoRank.parse(orderKeyToJumpTo));
					newOrderKey = jumpPast.between(VLexoRank.parse(orderKeyToJumpTo)).toString();
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
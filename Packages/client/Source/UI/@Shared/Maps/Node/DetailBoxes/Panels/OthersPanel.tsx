import {ArgumentType, AttachmentType, CanConvertFromClaimTypeXToY, ChangeClaimType, ClaimForm, GetAccessPolicy, GetAttachmentType_Node, GetNodeLinks, GetNodeDisplayText, GetNodeMirrorChildren, GetParentNodeL3, GetUserPermissionGroups, HasAdminPermissions, IsSinglePremiseArgument, IsUserCreatorOrMod, Map, NodeL3, NodeType, MeID, ReverseArgumentPolarity, SetNodeArgumentType, UpdateLink, UpdateNodeAccessPolicy, GetLinkUnderParent, GetLinkAtPath, ReversePolarity, Polarity, OrderKey} from "dm_common";
import React, {Fragment} from "react";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI.js";
import {UUIDPathStub, UUIDStub} from "UI/@Shared/UUIDStub.js";
import {RunCommand_UpdateNodeLink, RunCommand_UpdateNode} from "Utils/DB/Command.js";
import {Observer} from "web-vcore";
import {Assert, E, GetEntries, ModifyString} from "web-vcore/nm/js-vextensions.js";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Button, CheckBox, Column, Pre, Row, Select, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {PolicyPicker} from "../../../../../Database/Policies/PolicyPicker.js";

@Observer
export class OthersPanel extends BaseComponentPlus({} as {show: boolean, map?: Map|n, node: NodeL3, path: string}, {convertToType: null as AttachmentType|n}) {
	render() {
		const {show, map, node, path} = this.props;
		let {convertToType} = this.state;

		const mapID = map ? map.id : null;
		const userID = MeID();
		const _ = GetUserPermissionGroups(userID);
		//const creator = GetUser(node.creator);
		// viewers: GetNodeViewers(node.id),
		const creatorOrMod = IsUserCreatorOrMod(userID, node);
		const accessPolicy = GetAccessPolicy(node.accessPolicy);

		const parent = GetParentNodeL3(path);
		const parentPath = SlicePath(path, 1) as string;
		const parentCreatorOrMod = IsUserCreatorOrMod(userID, parent);

		let nodeArgOrParentSPArg_info: {node: NodeL3, path: string, creatorOrMod: boolean}|n;
		if (node.type == NodeType.argument) nodeArgOrParentSPArg_info = {node, path, creatorOrMod};
		else if (parent?.type === NodeType.argument) nodeArgOrParentSPArg_info = {node: parent, path: parentPath, creatorOrMod: parentCreatorOrMod};
		const nodeArgOrParentSPArg_linkUnderParent = nodeArgOrParentSPArg_info ? GetLinkAtPath(nodeArgOrParentSPArg_info.path) : null;

		const convertToTypes = GetEntries(AttachmentType).filter(pair=>CanConvertFromClaimTypeXToY(GetAttachmentType_Node(node), pair.value as any));
		convertToType = convertToType ?? convertToTypes.map(a=>a.value as any as AttachmentType).FirstOrX();

		const isArgument_any = node.argumentType === ArgumentType.any;
		/* const parents = GetNodesByIDs(node.parents?.VKeys() ?? []);
		const parentsArePrivateInSameMap = !IsSpecialEmptyArray(parents) && mapID && parents.All((a) => a.ownerMapID == mapID);
		const canChangeOwnershipType = creatorOrMod && (
			node.ownerMapID == null
				// if making private, node must be in a private map, and all its parents must be private nodes within that map (to ensure we don't leave links in other maps, which would make the owner-map-id invalid)
				? (mapID && map.type == MapType.private && parentsArePrivateInSameMap)
				// if making public, can't be root node, and the owner map must allow public nodes (at some point, may remove this restriction, by having action cause node to be auto-replaced with in-map private-copy)
				: (node.parents?.VKeys().length > 0) // && map.allowPublicNodes)
		); */

		const argumentWrapper = IsSinglePremiseArgument(parent) ? parent : null;

		/*const changeControlType_currentType = node.ownerMapID != null ? "Private" : "Public";
		// const changeControlType_newType = changeControlType_currentType == 'Private' ? 'Public' : 'Private';
		const changeControlTypeCommand = new ChangeNodeOwnerMap(EV({nodeID: node.id, newOwnerMapID: node.ownerMapID != null ? null : mapID, argumentNodeID: OmitIfFalsy(argumentWrapper?.id)}));
		//const changeChildOrderTypeCommand = new ChangeNodeChildOrderType(E({nodeID: node.id, newOrderType: node.childrenOrderType == ChildOrderType.manual ? ChildOrderType.byRating : ChildOrderType.manual}));*/

		const parentLinks = GetNodeLinks(null, node.id);
		const childLinks = GetNodeLinks(node.id);
		const mirrorChildren = GetNodeMirrorChildren(node.id);
		/*const childOrderTypeChangeable = node.ownerMapID != null // if private node
			|| HasAdminPermissions(MeID()) // or has admin permissions
			|| (node.type === NodeType.argument && node.multiPremiseArgument); // or it's a multi-premise argument (these start as manual)*/
		return (
			<Column sel style={{position: "relative", display: show ? null : "none"}}>
				<GenericEntryInfoUI id={node.id} creatorID={node.creator} createdAt={node.createdAt} accessPolicyID={node.accessPolicy}
					accessPolicyButton={
						<PolicyPicker containerStyle={{flex: "none"}} value={node.accessPolicy} onChange={async val=>{
							//new UpdateNodeAccessPolicy({nodeID: node.id, accessPolicy: val}).RunOnServer();
							await RunCommand_UpdateNode({id: node.id, updates: {accessPolicy: val}});
						}}>
							{/*<Button ml={5} enabled={creatorOrMod} text={accessPolicy ? `${accessPolicy.name} (id: ${accessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>*/}
							<Button ml={5} p="3px 7px" enabled={creatorOrMod} text="Change" style={{width: "100%"}}/>
						</PolicyPicker>
					}/>
				<Row style={{flexWrap: "wrap"}}>
					<Text>Parents: </Text>
					{parentLinks.length == 0 ? "none" : parentLinks.map((link, index)=>{
						return <Fragment key={index}>
							{index != 0 && <Text>, </Text>}
							<UUIDStub id={link.parent}/>
						</Fragment>;
					})}
				</Row>
				<Row style={{flexWrap: "wrap"}}>
					<Text>Children: </Text>
					{childLinks.length == 0 ? "none" : childLinks.map((link, index)=>{
						return <Fragment key={index}>
							{index != 0 && <Text>, </Text>}
							<UUIDStub id={link.child}/>
						</Fragment>;
					})}
					{HasAdminPermissions(MeID()) &&
					<Button ml={5} p="1px 5px" text="Simplify order-keys" onClick={()=>{
						ShowMessageBox({
							title: "Simplify order keys of children?",
							message: "Doing so will update the link entries to each child, making their order-keys equidistant to each other (starting from the standard lexo-rank mid-key).",
							cancelButton: true,
							onOK: async()=>{
								const newOrderKeys = [] as string[];
								for (const [i, childLink] of childLinks.entries()) {
									newOrderKeys[i] = i == 0 ? OrderKey.mid().key : new OrderKey(newOrderKeys.Last()).next().key;
									/*await new UpdateLink({
										linkID: childLink.id,
										linkUpdates: {orderKey: newOrderKeys[i]},
									}).RunOnServer();*/
									await RunCommand_UpdateNodeLink({id: childLink.id, updates: {orderKey: newOrderKeys[i]}});
								}
								ShowMessageBox({title: "Complete", message: "Simplification of children order-keys is complete."});
							},
						});
					}}/>}
				</Row>
				<Row style={{flexWrap: "wrap"}}>
					<Text>Mirror children: </Text>
					{mirrorChildren.length == 0 ? "none" : mirrorChildren.map(a=>a.id).map((childID, index)=>{
						return <Fragment key={index}>
							{index != 0 && <Text>, </Text>}
							<UUIDStub id={childID}/>
						</Fragment>;
					})}
				</Row>

				{nodeArgOrParentSPArg_info && <>
					<Row mt={10} style={{fontWeight: "bold"}}>Argument:</Row>
					<Row mt={5}>
						<Pre>Type: If </Pre>
						<Select options={GetEntries(ArgumentType, name=>ModifyString(name, m=>[m.lowerUpper_to_lowerSpaceLower]))}
							enabled={nodeArgOrParentSPArg_info.creatorOrMod} value={nodeArgOrParentSPArg_info.node.argumentType} onChange={async val=>{
								//new SetNodeArgumentType({mapID, nodeID: nodeArgOrParentSPArg_info!.node.id, argumentType: val}).RunOnServer();
								await RunCommand_UpdateNode({id: nodeArgOrParentSPArg_info!.node.id, updates: {argumentType: val}});
							}}/>
						<Pre> premises are true, they impact the parent.</Pre>
					</Row>
					<Row>
						<Button mt={3} text="Reverse argument polarity" enabled={nodeArgOrParentSPArg_info.creatorOrMod} onLeftClick={()=>{
							ShowMessageBox({
								title: "Reverse argument polarity?", cancelButton: true,
								// message: `Reverse polarity of argument "${GetNodeDisplayText(nodeArgOrParentSPArg_controlled)}"?\n\nAll relevance ratings will be deleted.`,
								message: `Reverse polarity of argument "${GetNodeDisplayText(nodeArgOrParentSPArg_info!.node)}"?`,
								onOK: ()=>{
									//new ReverseArgumentPolarity({mapID, nodeID: nodeArgOrParentSPArg_info!.node.id, path: nodeArgOrParentSPArg_info!.path}).RunOnServer();
									const link = nodeArgOrParentSPArg_linkUnderParent!;
									Assert(link.polarity, "Attempting to reverse polarity of an argument node, but the argument node's polarity is null!");
									RunCommand_UpdateNodeLink({id: link.id, updates: {polarity: ReversePolarity(link.polarity)}});
								},
							});
						}}/>
					</Row>
				</>}
				{/*node.type == NodeType.claim && convertToTypes.length > 0 &&
					<Row center>
						<Pre>Convert to: </Pre>
						<Select options={convertToTypes} value={convertToType} onChange={val=>this.SetState({convertToType: val})}/>
						<Button ml={5} text="Convert" onClick={()=>{
							new ChangeClaimType({mapID, nodeID: node.id, newType: convertToType!}).RunOnServer();
						}}/>
					</Row>*/}
				{/*childOrderTypeChangeable &&
					<Row center>
						<Text>Children order type:</Text>
						<Select ml={5} options={GetEntries(ChildOrderType)} value={node.childrenOrderType} enabled={changeControlTypeCommand.Validate_Safe() == null} title={changeControlTypeCommand.ValidateErrorStr} onChange={val=>{
							changeControlTypeCommand.RunOnServer();
						}}/>
						<InfoButton ml={5} text="Private nodes are locked to a given map, but allow more permission controls to the node-creator and map-editors."/>
					</Row>*/}
				{/*node.childrenOrderType == ChildOrderType.manual &&
					<ChildrenOrder mapID={mapID} node={node}/>*/}
				{/*<ChildrenOrder mapID={mapID} node={node}/>*/}
				<AtThisLocation node={node} path={path}/>
			</Column>
		);
	}
}

class AtThisLocation extends BaseComponent<{node: NodeL3, path: string}, {}> {
	render() {
		const {node, path} = this.props;
		if (path.split("/").length === 0) return <div/>; // if the root of a map, or subnode

		let canSetAsNegation = false;
		let canSetAsSeriesAnchor = false;
		if (node.type == NodeType.claim && node.link) {
			const claimType = GetAttachmentType_Node(node);
			canSetAsNegation = claimType === AttachmentType.none && node.link.form !== ClaimForm.question;
			canSetAsSeriesAnchor = claimType === AttachmentType.equation && !node.current.attachments[0]?.equation!.isStep; // && !creating;
		}

		return (
			<Column mt={10}>
				<Row style={{fontWeight: "bold"}}>At this location:</Row>
				<Row style={{whiteSpace: "normal"}}>
					<Text>Path: </Text>
					<UUIDPathStub path={path}/>
				</Row>
				{node.link &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Order key: </Pre>
						<TextInput value={node.link.orderKey} onChange={async val=>{
							/*new UpdateLink({
								linkID: node.link!.id,
								linkUpdates: {orderKey: val},
							}).RunOnServer();*/
							await RunCommand_UpdateNodeLink({id: node.link!.id, updates: {orderKey: val}});
						}}/>
					</Row>}
				{node.link && canSetAsNegation &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Show as negation: </Pre>
						<CheckBox value={node.link.form == ClaimForm.negation}
							onChange={async val=>{
								/*new UpdateLink({
									linkID: node.link!.id,
									linkUpdates: {form: val ? ClaimForm.negation : ClaimForm.base},
								}).RunOnServer();*/
								await RunCommand_UpdateNodeLink({id: node.link!.id, updates: {form: val ? ClaimForm.negation : ClaimForm.base}});
							}}/>
					</Row>}
				{node.link && canSetAsSeriesAnchor &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Show as series anchor: </Pre>
						<CheckBox value={node.link.seriesAnchor ?? false}
							// onChange={val=>Change(val ? newLinkData.isStep = true : delete newLinkData.isStep)}/>
							onChange={async val=>{
								/*new UpdateLink({
									linkID: node.link!.id,
									linkUpdates: {seriesAnchor: val || undefined},
								}).RunOnServer();*/
								await RunCommand_UpdateNodeLink({id: node.link!.id, updates: {seriesAnchor: val || undefined}});
							}}/>
					</Row>}
			</Column>
		);
	}
}

/*@Observer
class ChildrenOrder extends BaseComponent<{mapID: string, node: NodeL3}, {}> {
	render() {
		const {mapID, node} = this.props;
		const oldChildrenOrder = node.childrenOrder || [];
		//const oldChildrenOrderValid = oldChildrenOrder.length == node.children.VKeys().length && oldChildrenOrder.every(id=>node.children[id] != null);

		const childOrderType = node.childrenOrder ? ChildOrderType.manual : ChildOrderType.byRating;
		const updateChildrenOrderCommand = new UpdateNodeChildrenOrder({mapID, nodeID: node.id, childrenOrder: null});
		return (
			<Column mt={5}>
				<Row style={E(childOrderType == ChildOrderType.manual && {fontWeight: "bold"})}>
					<Text>Children order:</Text>
					<Select ml={5} options={GetEntries(ChildOrderType)} value={childOrderType} enabled={updateChildrenOrderCommand.Validate_Safe() == null} title={updateChildrenOrderCommand.ValidateErrorStr} onChange={val=>{
						if (val == ChildOrderType.manual) {
							const existingValidIDs = oldChildrenOrder.filter(id=>node.children[id] != null);
							const missingChildIDs = (node.children || {}).Pairs().filter(pair=>!oldChildrenOrder.Contains(pair.key)).map(pair=>pair.key);
							updateChildrenOrderCommand.payload.childrenOrder = existingValidIDs.concat(missingChildIDs);
							updateChildrenOrderCommand.RunOnServer();
						} else {
							updateChildrenOrderCommand.RunOnServer();
						}
					}}/>
				</Row>
				{node.childrenOrder && oldChildrenOrder.map((childID, index)=>{
					const childPath = (node.id ? `${node.id}/` : "") + childID;
					const child = GetNodeL3(childPath);
					const childTitle = child ? GetNodeDisplayText(child, childPath, GetNodeForm(child, node)) : "...";
					return (
						<Row key={index} style={{alignItems: "center"}}>
							<Row mr={7} sel style={{opacity: 0.5}}>
								<Text>#</Text>
								<UUIDStub id={childID}/>
							</Row>
							<Div sel style={ES({flex: 1, whiteSpace: "normal"})}>{childTitle}</Div>
							{/* <TextInput enabled={false} style={ES({flex: 1})} required pattern={NodeL1_id}
								value={`#${childID.toString()}: ${childTitle}`}
								//onChange={val=>Change(!IsNaN(val.ToInt()) && (newData.childrenOrder[index] = val.ToInt()))}
							/> *#/}
							<Button text={<Icon size={16} icon="arrow-up"/> as any} m={2} ml={5} style={{padding: 3}} enabled={index > 0}
								onClick={()=>{
									const newOrder = oldChildrenOrder.slice(0);
									newOrder.RemoveAt(index);
									newOrder.Insert(index - 1, childID);
									new UpdateNodeChildrenOrder({mapID, nodeID: node.id, childrenOrder: newOrder}).RunOnServer();
								}}/>
							<Button text={<Icon size={16} icon="arrow-down"/> as any} m={2} ml={5} style={{padding: 3}} enabled={index < oldChildrenOrder.length - 1}
								onClick={()=>{
									const newOrder = oldChildrenOrder.slice(0);
									newOrder.RemoveAt(index);
									newOrder.Insert(index + 1, childID);
									new UpdateNodeChildrenOrder({mapID, nodeID: node.id, childrenOrder: newOrder}).RunOnServer();
								}}/>
						</Row>
					);
				})}
				{/*node.childrenOrder && !oldChildrenOrderValid && updateChildrenOrderCommand.Validate_Safe() == null &&
					<Button mr="auto" text="Fix children-order" onClick={()=>{
						InitializeChildrenOrder();
					}}/>*#/}
			</Column>
		);
	}
}*/
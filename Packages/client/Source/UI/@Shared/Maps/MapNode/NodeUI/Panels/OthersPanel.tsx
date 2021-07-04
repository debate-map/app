import {ArgumentType, AttachmentType, CanConvertFromClaimTypeXToY, ChangeClaimType, ClaimForm, GetAttachmentType, GetNodeChildLinks, GetNodeDisplayText, GetNodeMirrorChildren, GetParentNodeL3, GetUserPermissionGroups, IsSinglePremiseArgument, IsUserCreatorOrMod, Map, MapNodeL3, MapNodeType, MeID, ReverseArgumentPolarity, UpdateLink} from "dm_common";
import {Fragment} from "react";
import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI.js";
import {UUIDPathStub, UUIDStub} from "UI/@Shared/UUIDStub.js";
import {Observer} from "web-vcore";
import {E, GetEntries} from "web-vcore/nm/js-vextensions.js";
import {SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {Button, CheckBox, Column, Pre, Row, Select, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

@Observer
export class OthersPanel extends BaseComponentPlus({} as {show: boolean, map?: Map, node: MapNodeL3, path: string}, {convertToType: null as AttachmentType|n}) {
	render() {
		const {show, map, node, path} = this.props;
		let {convertToType} = this.state;

		const mapID = map ? map.id : null;
		const userID = MeID();
		const _ = GetUserPermissionGroups(userID);
		//const creator = GetUser(node.creator);
		// viewers: GetNodeViewers(node.id),
		const creatorOrMod = IsUserCreatorOrMod(userID, node);

		const parent = GetParentNodeL3(path);
		const parentPath = SlicePath(path, 1);
		const parentCreatorOrMod = IsUserCreatorOrMod(userID, parent);

		const nodeArgOrParentSPArg_controlled = (node.type == MapNodeType.argument && creatorOrMod ? node : null)
			|| (parent && parent.type === MapNodeType.argument && parentCreatorOrMod ? parent : null);
		const nodeArgOrParentSPArg_controlled_path = nodeArgOrParentSPArg_controlled && (nodeArgOrParentSPArg_controlled === node ? path : parentPath);

		const convertToTypes = GetEntries(AttachmentType).filter(pair=>CanConvertFromClaimTypeXToY(GetAttachmentType(node), pair.value as any));
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
		const changeControlTypeCommand = new ChangeNodeOwnerMap(E({nodeID: node.id, newOwnerMapID: node.ownerMapID != null ? null : mapID, argumentNodeID: OmitIfFalsy(argumentWrapper?.id)}));
		//const changeChildOrderTypeCommand = new ChangeNodeChildOrderType(E({nodeID: node.id, newOrderType: node.childrenOrderType == ChildOrderType.manual ? ChildOrderType.byRating : ChildOrderType.manual}));*/

		const parentLinks = GetNodeChildLinks(null, node.id);
		const childLinks = GetNodeChildLinks(node.id);
		const mirrorChildren = GetNodeMirrorChildren(node.id);
		/*const childOrderTypeChangeable = node.ownerMapID != null // if private node
			|| HasAdminPermissions(MeID()) // or has admin permissions
			|| (node.type === MapNodeType.argument && node.multiPremiseArgument); // or it's a multi-premise argument (these start as manual)*/
		return (
			<Column sel style={{position: "relative", display: show ? null : "none"}}>
				<IDAndCreationInfoUI id={node.id} creatorID={node.creator} createdAt={node.createdAt}/>
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
				{/*<Row center>
					<Text>Control type:</Text>
					<Select ml={5} options={["Private", "Public"]} value={changeControlType_currentType} enabled={changeControlTypeCommand.Validate_Safe() == null} title={changeControlTypeCommand.validateError} onChange={val=>{
						changeControlTypeCommand.Run();
					}}/>
					<InfoButton ml={5} text="Private nodes are locked to a given map, but allow more permission controls to the node-creator and map-editors."/>
				</Row>*/}
				{/* <Row>Viewers: {viewers.length || '...'} <InfoButton text="The number of registered users who have had this node displayed in-map at some point."/></Row> */}
				{nodeArgOrParentSPArg_controlled &&
					<Row>
						<Button mt={3} text="Reverse argument polarity" onLeftClick={()=>{
							ShowMessageBox({
								title: "Reverse argument polarity?", cancelButton: true,
								// message: `Reverse polarity of argument "${GetNodeDisplayText(nodeArgOrParentSPArg_controlled)}"?\n\nAll relevance ratings will be deleted.`,
								message: `Reverse polarity of argument "${GetNodeDisplayText(nodeArgOrParentSPArg_controlled)}"?`,
								onOK: ()=>{
									new ReverseArgumentPolarity(E(mapID && {mapID}, {nodeID: nodeArgOrParentSPArg_controlled.id, path: nodeArgOrParentSPArg_controlled_path!})).Run();
								},
							});
						}}/>
					</Row>}
				{node.type == MapNodeType.claim && convertToTypes.length > 0 &&
					<Row center>
						<Pre>Convert to: </Pre>
						<Select options={convertToTypes} value={convertToType} onChange={val=>this.SetState({convertToType: val})}/>
						<Button ml={5} text="Convert" onClick={()=>{
							new ChangeClaimType(E({mapID, nodeID: node.id, newType: convertToType!})).Run();
						}}/>
					</Row>}
				{/*childOrderTypeChangeable &&
					<Row center>
						<Text>Children order type:</Text>
						<Select ml={5} options={GetEntries(ChildOrderType)} value={node.childrenOrderType} enabled={changeControlTypeCommand.Validate_Safe() == null} title={changeControlTypeCommand.validateError} onChange={val=>{
							changeControlTypeCommand.Run();
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

class AtThisLocation extends BaseComponent<{node: MapNodeL3, path: string}, {}> {
	render() {
		const {node, path} = this.props;
		if (path.split("/").length === 0) return <div/>; // if the root of a map, or subnode

		let canSetAsNegation;
		let canSetAsSeriesAnchor;
		if (node.type == MapNodeType.claim) {
			const claimType = GetAttachmentType(node);
			canSetAsNegation = claimType === AttachmentType.none && node.link.form !== ClaimForm.yesNoQuestion;
			canSetAsSeriesAnchor = claimType === AttachmentType.equation && !node.current.equation!.isStep; // && !creating;
		}

		return (
			<Column mt={10}>
				<Row style={{fontWeight: "bold"}}>At this location:</Row>
				<Row style={{whiteSpace: "normal"}}>
					<Text>Path: </Text>
					<UUIDPathStub path={path}/>
				</Row>
				{canSetAsNegation &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Show as negation: </Pre>
						<CheckBox value={node.link.form == ClaimForm.negation}
							onChange={val=>{
								new UpdateLink({
									linkID: node.link.id,
									linkUpdates: {form: val ? ClaimForm.negation : ClaimForm.base},
								}).Run();
							}}/>
					</Row>}
				{canSetAsSeriesAnchor &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Show as series anchor: </Pre>
						<CheckBox value={node.link.seriesAnchor ?? false}
							// onChange={val=>Change(val ? newLinkData.isStep = true : delete newLinkData.isStep)}/>
							onChange={val=>{
								new UpdateLink({
									linkID: node.link.id,
									linkUpdates: {seriesAnchor: val || undefined},
								}).Run();
							}}/>
					</Row>}
			</Column>
		);
	}
}

/*@Observer
class ChildrenOrder extends BaseComponent<{mapID: string, node: MapNodeL3}, {}> {
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
					<Select ml={5} options={GetEntries(ChildOrderType)} value={childOrderType} enabled={updateChildrenOrderCommand.Validate_Safe() == null} title={updateChildrenOrderCommand.validateError} onChange={val=>{
						if (val == ChildOrderType.manual) {
							const existingValidIDs = oldChildrenOrder.filter(id=>node.children[id] != null);
							const missingChildIDs = (node.children || {}).Pairs().filter(pair=>!oldChildrenOrder.Contains(pair.key)).map(pair=>pair.key);
							updateChildrenOrderCommand.payload.childrenOrder = existingValidIDs.concat(missingChildIDs);
							updateChildrenOrderCommand.Run();
						} else {
							updateChildrenOrderCommand.Run();
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
							{/* <TextInput enabled={false} style={ES({flex: 1})} required pattern={MapNode_id}
								value={`#${childID.toString()}: ${childTitle}`}
								//onChange={val=>Change(!IsNaN(val.ToInt()) && (newData.childrenOrder[index] = val.ToInt()))}
							/> *#/}
							<Button text={<Icon size={16} icon="arrow-up"/> as any} m={2} ml={5} style={{padding: 3}} enabled={index > 0}
								onClick={()=>{
									const newOrder = oldChildrenOrder.slice(0);
									newOrder.RemoveAt(index);
									newOrder.Insert(index - 1, childID);
									new UpdateNodeChildrenOrder({mapID, nodeID: node.id, childrenOrder: newOrder}).Run();
								}}/>
							<Button text={<Icon size={16} icon="arrow-down"/> as any} m={2} ml={5} style={{padding: 3}} enabled={index < oldChildrenOrder.length - 1}
								onClick={()=>{
									const newOrder = oldChildrenOrder.slice(0);
									newOrder.RemoveAt(index);
									newOrder.Insert(index + 1, childID);
									new UpdateNodeChildrenOrder({mapID, nodeID: node.id, childrenOrder: newOrder}).Run();
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
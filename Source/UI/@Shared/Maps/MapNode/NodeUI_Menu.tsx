import CloneNode from "Server/Commands/CloneNode";
import LinkNode from "Server/Commands/LinkNode";
import SetNodeIsMultiPremiseArgument from "Server/Commands/SetNodeIsMultiPremiseArgument";
import UnlinkNode from "Server/Commands/UnlinkNode";
import {HolderType} from "Store/firebase/nodes";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";
import {ACTSetLastAcknowledgementTime, GetCopiedNodePath} from "Store/main";
import {GetTimeFromWhichToShowChangedNodes} from "Store/main/maps/$map";
import {ShowAddSubnodeDialog} from "UI/@Shared/Maps/MapNode/NodeUI_Menu/AddSubnodeDialog";
import {E} from "js-vextensions";
import {BaseComponentWithConnector, BaseComponent} from "react-vextensions";
import {VMenuStub} from "react-vmenu";
import {VMenuItem} from "react-vmenu/dist/VMenu";
import {ShowMessageBox} from "react-vmessagebox";
import {GetAsync, SlicePath} from "../../../../Frame/Database/DatabaseHelpers";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import AddChildNode from "../../../../Server/Commands/AddChildNode";
import {DeleteNode} from "../../../../Server/Commands/DeleteNode";
import {RootState} from "../../../../Store";
import {GetPathsToNodesChangedSinceX} from "../../../../Store/firebase/mapNodeEditTimes";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {ForCopy_GetError, ForCut_GetError, ForDelete_GetError, ForUnlink_GetError, GetNodeChildrenL3, GetNodeID, GetParentNodeL3, IsNewLinkValid, IsNodeSubnode} from "../../../../Store/firebase/nodes";
import {GetNodeDisplayText, GetNodeL3, GetValidNewChildTypes, IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument} from "../../../../Store/firebase/nodes/$node";
import {ClaimForm, MapNode, MapNodeL3, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {GetMapNodeTypeDisplayName, MapNodeType, MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {IsUserBasicOrAnon, IsUserCreatorOrMod, IsUserMod} from "../../../../Store/firebase/userExtras";
import {GetUserID, GetUserPermissionGroups} from "../../../../Store/firebase/users";
import {ACTNodeCopy, GetCopiedNode} from "../../../../Store/main";
import {GetPathNodeIDs} from "../../../../Store/main/mapViews";
import {ShowSignInPopup} from "../../NavBar/UserPanel";
import {ShowAddChildDialog} from "./NodeUI_Menu/AddChildDialog";

type Props = {map: Map, node: MapNodeL3, path: string, inList?: boolean, holderType?: HolderType};
type SharedProps = Props & Partial<{combinedWithParentArg: boolean, copiedNode: MapNodeL3, copiedNodePath: string, copiedNode_asCut: boolean}> & {};
let connector = (_: RootState, {map, node, path, holderType}: Props)=> {
	let sinceTime = GetTimeFromWhichToShowChangedNodes(map._id);
	let pathsToChangedNodes = GetPathsToNodesChangedSinceX(map._id, sinceTime);
	let pathsToChangedInSubtree = pathsToChangedNodes.filter(a=>a == path || a.startsWith(path + "/")); // also include self, for this
	let parent = GetParentNodeL3(path);

	let copiedNode = GetCopiedNode();
	let copiedNodePath = GetCopiedNodePath();

	// if we're copying a (single-premise) argument into a place where it's supposed to be a claim, we have to paste just that inner claim
	/*if (copiedNode && copiedNode.type == MapNodeType.Argument && IsMultiPremiseArgument(node) && holderType == null) {
		copiedNode = GetNodeChildrenL3(copiedNode)[0];
		copiedNodePath = copiedNode ? `${copiedNodePath}/${copiedNode._id}` : null;
		// todo: ms old wrapper is also deleted (probably)
	}*/

	// if we're copying a claim into a place where it's supposed to be an argument, pretend we had actually copied the parent-arg of it
	/*if (copiedNode && copiedNode.type == MapNodeType.Claim && holderType != null) {
		copiedNode = GetNodeL3(SlicePath(copiedNodePath, 1));
		copiedNodePath = SlicePath(copiedNodePath, 1);
	}*/

	return {
		_: (ForUnlink_GetError(GetUserID(), node), ForDelete_GetError(GetUserID(), node)),
		//userID: GetUserID(), // not needed in Connect(), since permissions already watches its data
		permissions: GetUserPermissionGroups(GetUserID()),
		parent,
		//nodeChildren: GetNodeChildrenL3(node, path),
		nodeChildren: GetNodeChildrenL3(node, path),
		combinedWithParentArg: IsPremiseOfSinglePremiseArgument(node, parent),
		copiedNode,
		copiedNodePath,
		copiedNode_asCut: State(a=>a.main.copiedNodePath_asCut),
		pathsToChangedInSubtree,
	};
}
@Connect(connector)
export class NodeUI_Menu extends BaseComponentWithConnector(connector, {}) {
	render() {
		let {map, node, path, inList, holderType,
			permissions, parent, nodeChildren, combinedWithParentArg, copiedNode, copiedNodePath, copiedNode_asCut, pathsToChangedInSubtree} = this.props;
		let userID = GetUserID();
		let firebase = store.firebase.helpers;
		//let validChildTypes = MapNodeType_Info.for[node.type].childTypes;
		let validChildTypes = GetValidNewChildTypes(node, path, holderType, permissions);
		let componentBox = holderType != null;
		if (holderType) {
			validChildTypes = validChildTypes.Except(MapNodeType.Claim);
		} else {
			validChildTypes = validChildTypes.Except(MapNodeType.Argument);
		}

		let formForClaimChildren = node.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base;

		let nodeText = GetNodeDisplayText(node, path);

		let sharedProps = this.props;
		return (
			<VMenuStub preOpen={e=>e.passThrough != true}>
				{IsUserBasicOrAnon(userID) && !inList && validChildTypes.map(childType=> {
					let childTypeInfo = MapNodeType_Info.for[childType];
					//let displayName = GetMapNodeTypeDisplayName(childType, node, form);
					let polarities = childType == MapNodeType.Argument ? [Polarity.Supporting, Polarity.Opposing] : [null];
					return polarities.map(polarity=> {
						let displayName = GetMapNodeTypeDisplayName(childType, node, ClaimForm.Base, polarity);
						return (
							<VMenuItem key={childType + "_" + polarity} text={`Add ${displayName}`} style={styles.vMenuItem} onClick={e=> {
								if (e.button != 0) return;
								if (userID == null) return ShowSignInPopup();
								
								ShowAddChildDialog(node, path, childType, polarity, userID, map._id);
							}}/>
						);
					});
				})}
				{//IsUserBasicOrAnon(userID) && !inList && path.includes("/") && !path.includes("L") && !componentBox &&
				// for now, only let mods add layer-subnodes (confusing otherwise)
				IsUserMod(userID) && !inList && path.includes("/") && !path.includes("L") && !componentBox &&
					<VMenuItem text="Add subnode (in layer)" style={styles.vMenuItem}
						onClick={e=> {
							if (e.button != 0) return;
							if (userID == null) return ShowSignInPopup();
							ShowAddSubnodeDialog(map._id, node, path);
						}}/>}
				{IsUserCreatorOrMod(userID, parent) && node.type == MapNodeType.Claim && IsSinglePremiseArgument(parent) && !componentBox &&
					<VMenuItem text="Convert to multi-premise" style={styles.vMenuItem}
						onClick={async e=> {
							if (e.button != 0) return;

							/*let newNode = new MapNode({
								parents: {[parent._id]: {_: true}},
								type: MapNodeType.Claim,
							});
							let newRevision = new MapNodeRevision({titles: {base: "Second premise (click to edit)"}});
							let newLink = {_: true, form: ClaimForm.Base} as ChildEntry;

							SetNodeUILocked(parent._id, true);
							let info = await new AddChildNode({mapID: map._id, node: newNode, revision: newRevision, link: newLink}).Run();
							store.dispatch(new ACTMapNodeExpandedSet({mapID: map._id, path: path + "/" + info.nodeID, expanded: true, recursive: false}));
							store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info.nodeID, time: Date.now()}));

							await WaitTillPathDataIsReceiving(`nodeRevisions/${info.revisionID}`);
							await WaitTillPathDataIsReceived(`nodeRevisions/${info.revisionID}`);
							SetNodeUILocked(parent._id, false);*/

							await new SetNodeIsMultiPremiseArgument({nodeID: parent._id, multiPremiseArgument: true}).Run();
						}}/>}
				{IsUserCreatorOrMod(userID, node) && IsMultiPremiseArgument(node)
						&& nodeChildren.every(a=>a != null) && nodeChildren.filter(a=>a.type == MapNodeType.Claim).length == 1 && !componentBox &&
					<VMenuItem text="Convert to single-premise" style={styles.vMenuItem}
						onClick={async e=> {
							if (e.button != 0) return;

							await new SetNodeIsMultiPremiseArgument({nodeID: node._id, multiPremiseArgument: false}).Run();
						}}/>}
				{pathsToChangedInSubtree.length > 0 && !componentBox &&
					<VMenuItem text="Mark subtree as viewed" style={styles.vMenuItem}
						onClick={e=> {
							if (e.button != 0) return;
							for (let path of pathsToChangedInSubtree) {
								store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: GetNodeID(path), time: Date.now()}));
							}
						}}/>}
				{IsUserBasicOrAnon(userID) && !inList && !componentBox &&
					<VMenuItem text={copiedNode ? <span>Cut <span style={{fontSize: 10, opacity: .7}}>(right-click to clear)</span></span> as any : `Cut`}
						enabled={ForCut_GetError(userID, node) == null} title={ForCut_GetError(userID, node)}
						style={styles.vMenuItem}
						onClick={e=> {
							e.persist();
							if (e.button == 2) {
								return void store.dispatch(new ACTNodeCopy({path: null, asCut: true}));
							}

							/*let pathToCut = path;
							if (node.type == MapNodeType.Claim && combinedWithParentArg) {
								pathToCut = SlicePath(path, 1);
							}*/

							store.dispatch(new ACTNodeCopy({path, asCut: true}));
						}}/>}
				{IsUserBasicOrAnon(userID) && !componentBox &&
					<VMenuItem text={copiedNode ? <span>Copy <span style={{fontSize: 10, opacity: .7}}>(right-click to clear)</span></span> as any : `Copy`} style={styles.vMenuItem}
						enabled={ForCopy_GetError(userID, node) == null} title={ForCopy_GetError(userID, node)}
						onClick={e=> {
							e.persist();
							if (e.button == 2) {
								return void store.dispatch(new ACTNodeCopy({path: null, asCut: false}));
							}

							/*let pathToCopy = path;
							if (node.type == MapNodeType.Claim && combinedWithParentArg) {
								pathToCopy = SlicePath(path, 1);
							}*/
							
							store.dispatch(new ACTNodeCopy({path, asCut: false}));
						}}/>}
				<PasteAsLink_MenuItem {...sharedProps}/>
				{IsUserBasicOrAnon(userID) && copiedNode && IsNewLinkValid(path, holderType, copiedNode.Extended({_id: -1}), permissions) && !copiedNode_asCut &&
					<VMenuItem text={`Paste as clone: "${GetNodeDisplayText(copiedNode, null, formForClaimChildren).KeepAtMost(50)}"`} style={styles.vMenuItem} onClick={async e=> {
						if (e.button != 0) return;
						if (userID == null) return ShowSignInPopup();

						let baseNodePath = State(a=>a.main.copiedNodePath);
						let baseNodePath_ids = GetPathNodeIDs(baseNodePath);
						let info = await new CloneNode({mapID: map._id, baseNodePath, newParentID: node._id}).Run();

						store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info.nodeID, time: Date.now()}));
						
						if (copiedNode_asCut) {
							await new UnlinkNode({mapID: map._id, parentID: baseNodePath_ids.XFromLast(1), childID: baseNodePath_ids.Last()}).Run();
						}
					}}/>}
				<UnlinkContainerArgument_MenuItem {...sharedProps}/>
				{IsUserCreatorOrMod(userID, node) && !inList && !componentBox &&
					<VMenuItem text={`Unlink${combinedWithParentArg ? " claim" : ""}`}
						enabled={ForUnlink_GetError(userID, node) == null} title={ForUnlink_GetError(userID, node)}
						style={styles.vMenuItem} onClick={async e=> {
							if (e.button != 0) return;
							/*let error = ForUnlink_GetError(userID, node);
							if (error) {
								return void ShowMessageBox({title: `Cannot unlink`, message: error});
							}*/
							
							/*let parentNodes = await GetNodeParentsAsync(node);
							if (parentNodes.length <= 1) {*/
							/*if (node.parents.VKeys(true).length <= 1) {
								return void ShowMessageBox({title: `Cannot unlink`, message: `Cannot unlink this child, as doing so would orphan it. Try deleting it instead.`});
							}*/

							//let parent = parentNodes[0];
							let parentText = GetNodeDisplayText(parent, path.substr(0, path.lastIndexOf(`/`)));
							ShowMessageBox({
								title: `Unlink child "${nodeText}"`, cancelButton: true,
								message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
								onOK: ()=> {
									new UnlinkNode({mapID: map._id, parentID: parent._id, childID: node._id}).Run();
								}
							});
						}}/>}
				<DeleteContainerArgument_MenuItem {...sharedProps}/>
				{IsUserCreatorOrMod(userID, node) && !componentBox &&
					<VMenuItem text={`Delete${combinedWithParentArg ? " claim" : ""}`}
						enabled={ForDelete_GetError(userID, node) == null} title={ForDelete_GetError(userID, node)}
						style={styles.vMenuItem} onClick={e=> {
							if (e.button != 0) return;

							let contextStr = IsNodeSubnode(node) ? ", and its placement in-layer" : ", and its link with 1 parent";

							ShowMessageBox({
								title: `Delete "${nodeText}"`, cancelButton: true,
								message: `Delete the node "${nodeText}"${contextStr}?`,
								onOK: async ()=> {
									await new DeleteNode(E({mapID: map._id, nodeID: node._id})).Run();
								}
							});
						}}/>}
			</VMenuStub>
		);
	}
}

class PasteAsLink_MenuItem extends BaseComponent<SharedProps, {}> {
	render() {
		let {map, node, path, holderType, copiedNode, copiedNodePath, copiedNode_asCut, combinedWithParentArg} = this.props;
		if (!IsUserBasicOrAnon(GetUserID())) return <div/>;
		if (copiedNode == null) return <div/>;

		// if we're copying a claim into a place where it's supposed to be an argument, we have to create a wrapper argument-node for it
		let createWrapperArg = copiedNode.type == MapNodeType.Claim && holderType != null;
		if (createWrapperArg) {
			// just prepare the data here; it doesn't get added until later, in the proceed() function
			var argumentWrapper = new MapNode({
				type: MapNodeType.Argument,
				parents: {[node._id]: {_: true}}
			});
			var argumentWrapperRevision = new MapNodeRevision({});
			if (!IsNewLinkValid(path, holderType, argumentWrapper, GetUserPermissionGroups(GetUserID()))) return <div/>;
		} else {
			if (!IsNewLinkValid(path, holderType, copiedNode, GetUserPermissionGroups(GetUserID()))) return <div/>;
		}
		
		let formForClaimChildren = node.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base;

		return (
			<VMenuItem text={`Paste${copiedNode_asCut ? "" : " as link"}: "${GetNodeDisplayText(copiedNode, null, formForClaimChildren).KeepAtMost(50)}"`}
				//enabled={ForPaste_GetError(userID, map, node) == null} title={ForCut_GetError(userID, map, node)}
				style={styles.vMenuItem} onClick={e=> {
					if (e.button != 0) return;
					if (GetUserID() == null) return ShowSignInPopup();

					if (copiedNode.type == MapNodeType.Argument && !copiedNode_asCut) {
						return void ShowMessageBox({title: `Argument at two locations?`, cancelButton: true, onOK: proceed, message:
`Are you sure you want to paste this argument as a linked child?

Only do this if you're sure that the impact-premise applies exactly the same to both the old parent and the new parent.${""
} (usually it does not, ie. usually it's specific to its original parent claim)

If not, paste the argument as a clone instead.`
						});
					}
					proceed();

					async function proceed() {
						let pastedNodeHolder = node;

						if (createWrapperArg) {
							var addArgumentWrapper = new AddChildNode({
								mapID: map._id, node: argumentWrapper, revision: argumentWrapperRevision,
								link: E({_: true, polarity: Polarity.Supporting}) as any,
							});
							let {nodeID} = await addArgumentWrapper.Run();
							//pastedNodeHolder = AsNodeL3(AsNodeL2(argumentWrapper, argumentWrapperRevision), Polarity.Supporting);
							pastedNodeHolder = await GetAsync(()=>GetNodeL3(`${path}/${nodeID}`));
							store.dispatch(new ACTSetLastAcknowledgementTime({nodeID, time: Date.now()}));
						}

						await new LinkNode(E(
							{mapID: map._id, parentID: pastedNodeHolder._id, childID: copiedNode._id},
							copiedNode.type == MapNodeType.Claim && {childForm: formForClaimChildren},
							copiedNode.type == MapNodeType.Argument && {childPolarity: copiedNode.link.polarity},
						)).Run();
						if (copiedNode_asCut) {
							let copiedNodePath_ids = GetPathNodeIDs(copiedNodePath);
							await new UnlinkNode({mapID: map._id, parentID: copiedNodePath_ids.XFromLast(1), childID: copiedNodePath_ids.Last()}).Run();
						}
					}
				}}/>
		);
	}
}

class UnlinkContainerArgument_MenuItem extends BaseComponent<SharedProps, {}> {
	render() {
		let {map, node, path, holderType, combinedWithParentArg} = this.props;
		if (!combinedWithParentArg) return <div/>;
		let componentBox = holderType != null;
		if (componentBox) return <div/>;
		
		let argumentPath = SlicePath(path, 1);
		let argument = GetNodeL3(argumentPath);
		let argumentText = GetNodeDisplayText(argument, argumentPath);
		let forUnlink_error = ForUnlink_GetError(GetUserID(), argument);
		if (!IsUserCreatorOrMod(GetUserID(), argument)) return <div/>;

		let argumentParentPath = SlicePath(argumentPath, 1);
		let argumentParent = GetNodeL3(argumentParentPath);
		
		return (
			<VMenuItem text="Unlink argument" enabled={forUnlink_error == null} title={forUnlink_error}
				style={styles.vMenuItem} onClick={e=> {
					if (e.button != 0) return;

					ShowMessageBox({
						title: `Unlink "${argumentText}"`, cancelButton: true,
						message: `Unlink the argument "${argumentText}"?`,
						onOK: async ()=> {
							new UnlinkNode({mapID: map._id, parentID: argumentParent._id, childID: argument._id}).Run();
						}
					});
				}}/>
		);
	}
}

class DeleteContainerArgument_MenuItem extends BaseComponent<SharedProps, {}> {
	render() {
		let {map, node, path, holderType, combinedWithParentArg} = this.props;
		if (!combinedWithParentArg) return <div/>;
		let componentBox = holderType != null;
		if (componentBox) return <div/>;
		
		let argumentPath = SlicePath(path, 1);
		let argument = GetNodeL3(argumentPath);
		let argumentText = GetNodeDisplayText(argument, argumentPath);
		let forDelete_error = ForDelete_GetError(GetUserID(), argument, {childrenBeingDeleted: [node._id]});
		if (!IsUserCreatorOrMod(GetUserID(), argument)) return <div/>;
		
		let canDeleteBaseClaim = IsUserCreatorOrMod(GetUserID(), node);
		let baseClaim_action = node.parents.VKeys(true).length > 1 || !canDeleteBaseClaim ? "unlink" : "delete";
		let forBaseClaimAction_error = baseClaim_action == "unlink" ? ForUnlink_GetError(GetUserID(), node) : ForDelete_GetError(GetUserID(), node);

		return (
			<VMenuItem text="Delete argument" enabled={forDelete_error == null && forBaseClaimAction_error == null} title={forDelete_error || baseClaim_action}
				style={styles.vMenuItem} onClick={e=> {
					if (e.button != 0) return;

					ShowMessageBox({
						title: `Delete "${argumentText}"`, cancelButton: true,
						message: `Delete the argument "${argumentText}", and ${baseClaim_action} its base-claim?`,
						onOK: async ()=> {
							// if deleting single-premise argument, first delete or unlink the base-claim
							if (baseClaim_action == "unlink") {
								await new UnlinkNode({mapID: map._id, parentID: argument._id, childID: node._id}).Run();
							} else if (baseClaim_action == "delete") {
								await new DeleteNode({mapID: map._id, nodeID: node._id}).Run();
							}

							await new DeleteNode(E({mapID: map._id, nodeID: argument._id})).Run();
						}
					});
				}}/>
		);
	}
}
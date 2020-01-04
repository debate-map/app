import {E} from "js-vextensions";
import {SlicePath} from "mobx-firelink";
import {BaseComponent, BaseComponentPlus, WarnOfTransientObjectProps} from "react-vextensions";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {LinkNode_HighLevel} from "Server/Commands/LinkNode_HighLevel";
import {SetNodeIsMultiPremiseArgument} from "Server/Commands/SetNodeIsMultiPremiseArgument";
import {UnlinkNode} from "Server/Commands/UnlinkNode";
import {store} from "Store";
import {GetParentNodeID, HolderType, ForCopy_GetError, ForCut_GetError, ForDelete_GetError, ForUnlink_GetError, GetNodeChildrenL3, GetNodeID, GetParentNodeL3, IsNodeSubnode} from "Store/firebase/nodes";
import {GetCopiedNode, GetCopiedNodePath} from "Store/main/maps";
import {GetTimeFromWhichToShowChangedNodes} from "Store/main/maps/mapStates/$mapState";
import {Observer} from "vwebapp-framework";
import {runInAction} from "mobx";
import {GetOpenMapID} from "Store/main";
import {GetUserPermissionGroups, CanContributeToNode, IsUserCreatorOrMod, CanGetBasicPermissions} from "Store/firebase/users/$user";
import {DeleteNode} from "../../../../Server/Commands/DeleteNode";
import {GetPathsToNodesChangedSinceX} from "../../../../Store/firebase/mapNodeEditTimes";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {GetNodeDisplayText, GetNodeL3, GetValidNewChildTypes, IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument} from "../../../../Store/firebase/nodes/$node";
import {ClaimForm, MapNodeL3, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {GetMapNodeTypeDisplayName, MapNodeType, MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {MeID} from "../../../../Store/firebase/users";
import {styles} from "../../../../Utils/UI/GlobalStyles";
import {ShowSignInPopup} from "../../NavBar/UserPanel";
import {ShowAddChildDialog} from "./NodeUI_Menu/AddChildDialog";

export class NodeUI_Menu_Stub extends BaseComponent<Props, {}> {
	render() {
		const {...rest} = this.props;
		return (
			<VMenuStub delayEventHandler={true} preOpen={e=>e.passThrough != true}>
				<NodeUI_Menu {...rest}/>
			</VMenuStub>
		);
	}
}

type Props = {map?: Map, node: MapNodeL3, path: string, inList?: boolean, holderType?: HolderType};
type SharedProps = Props & {combinedWithParentArg: boolean, copiedNode: MapNodeL3, copiedNodePath: string, copiedNode_asCut: boolean};

@WarnOfTransientObjectProps
@Observer
export class NodeUI_Menu extends BaseComponentPlus({} as Props, {}) {
	render() {
		const {map, node, path, inList, holderType} = this.props;

		if (map) {
			const sinceTime = GetTimeFromWhichToShowChangedNodes(map._key);
			const pathsToChangedNodes = GetPathsToNodesChangedSinceX(map._key, sinceTime);
			var pathsToChangedInSubtree = pathsToChangedNodes.filter(a=>a == path || a.startsWith(`${path}/`)); // also include self, for this
		}
		const parent = GetParentNodeL3(path);

		const copiedNode = GetCopiedNode();
		const copiedNodePath = GetCopiedNodePath();

		ForUnlink_GetError(MeID(), node); // watch
		ForDelete_GetError(MeID(), node); // watch
		const userID = MeID();
		const permissions = GetUserPermissionGroups(userID);
		// nodeChildren: GetNodeChildrenL3(node, path),
		const nodeChildren = GetNodeChildrenL3(node, path);
		const combinedWithParentArg = IsPremiseOfSinglePremiseArgument(node, parent);
		const copiedNode_asCut = store.main.maps.copiedNodePath_asCut;

		const mapID = map ? map._key : null;
		// let validChildTypes = MapNodeType_Info.for[node.type].childTypes;
		let validChildTypes = GetValidNewChildTypes(node, holderType, permissions);
		const componentBox = holderType != null;
		if (holderType) {
			validChildTypes = validChildTypes.Except(MapNodeType.Claim);
		} else {
			validChildTypes = validChildTypes.Except(MapNodeType.Argument);
		}

		const formForClaimChildren = node.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base;

		const nodeText = GetNodeDisplayText(node, path);

		const sharedProps: SharedProps = E(this.props, {combinedWithParentArg, copiedNode, copiedNodePath, copiedNode_asCut});
		return (
			<div>
				{CanContributeToNode(userID, node._key) && !inList && validChildTypes.map(childType=>{
					const childTypeInfo = MapNodeType_Info.for[childType];
					// let displayName = GetMapNodeTypeDisplayName(childType, node, form);
					const polarities = childType == MapNodeType.Argument ? [Polarity.Supporting, Polarity.Opposing] : [null];
					return polarities.map(polarity=>{
						const displayName = GetMapNodeTypeDisplayName(childType, node, ClaimForm.Base, polarity);
						return (
							<VMenuItem key={`${childType}_${polarity}`} text={`Add ${displayName}`} style={styles.vMenuItem}
								onClick={e=>{
									if (e.button != 0) return;
									if (userID == null) return ShowSignInPopup();

									ShowAddChildDialog(path, childType, polarity, userID, mapID);
								}}/>
						);
					});
				})}
				{/* // IsUserBasicOrAnon(userID) && !inList && path.includes("/") && !path.includes("*") && !componentBox &&
				// for now, only let mods add layer-subnodes (confusing otherwise)
					HasModPermissions(userID) && !inList && path.includes('/') && !path.includes('*') && !componentBox &&
					<VMenuItem text="Add subnode (in layer)" style={styles.vMenuItem}
						onClick={(e) => {
							if (e.button != 0) return;
							if (userID == null) return ShowSignInPopup();
							ShowAddSubnodeDialog(mapID, node, path);
						}}/> */}
				{IsUserCreatorOrMod(userID, parent) && node.type == MapNodeType.Claim && IsSinglePremiseArgument(parent) && !componentBox &&
					<VMenuItem text="Convert to multi-premise" style={styles.vMenuItem}
						onClick={async e=>{
							if (e.button != 0) return;

							/* let newNode = new MapNode({
								parents: {[parent._id]: {_: true}},
								type: MapNodeType.Claim,
							});
							let newRevision = new MapNodeRevision({titles: {base: "Second premise (click to edit)"}});
							let newLink = {_: true, form: ClaimForm.Base} as ChildEntry;

							SetNodeUILocked(parent._id, true);
							let info = await new AddChildNode({mapID: mapID, node: newNode, revision: newRevision, link: newLink}).Run();
							store.dispatch(new ACTMapNodeExpandedSet({mapID: mapID, path: path + "/" + info.nodeID, expanded: true, recursive: false}));
							store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info.nodeID, time: Date.now()}));

							await WaitTillPathDataIsReceiving(`nodeRevisions/${info.revisionID}`);
							await WaitTillPathDataIsReceived(`nodeRevisions/${info.revisionID}`);
							SetNodeUILocked(parent._id, false); */

							await new SetNodeIsMultiPremiseArgument({nodeID: parent._key, multiPremiseArgument: true}).Run();
						}}/>}
				{IsUserCreatorOrMod(userID, node) && IsMultiPremiseArgument(node)
					&& nodeChildren.every(a=>a != null) && nodeChildren.filter(a=>a.type == MapNodeType.Claim).length == 1 && !componentBox &&
					<VMenuItem text="Convert to single-premise" style={styles.vMenuItem}
						onClick={async e=>{
							if (e.button !== 0) return;

							await new SetNodeIsMultiPremiseArgument({nodeID: node._key, multiPremiseArgument: false}).Run();
						}}/>}
				{pathsToChangedInSubtree && pathsToChangedInSubtree.length > 0 && !componentBox &&
					<VMenuItem text="Mark subtree as viewed" style={styles.vMenuItem}
						onClick={e=>{
							if (e.button != 0) return;
							for (const path of pathsToChangedInSubtree) {
								runInAction("NodeUIMenu.MarkSubtreeAsViewed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(GetNodeID(path), Date.now()));
							}
						}}/>}
				{/* inList &&
					<VMenuItem text="Find containing maps" style={styles.vMenuItem}
						onClick={(e) => {
							runInAction('NodeUIMenu.FindContainingMaps', () => {
								store.main.search.findNode_state = 'activating';
								store.main.search.findNode_node = node._key;
								store.main.search.findNode_type = 'FindContainingMaps';
								store.main.search.findNode_resultPaths = [];
							});
						}}/>}
				{inList && GetOpenMapID() != null &&
					<VMenuItem text="Find in current map" style={styles.vMenuItem}
						onClick={(e) => {
							runInAction('NodeUIMenu.FindInCurrentMap', () => {
								store.main.search.findNode_state = 'activating';
								store.main.search.findNode_node = node._key;
								store.main.search.findNode_type = 'FindInCurrentMap';
								store.main.search.findNode_resultPaths = [];
							});
						}}/> */}
				{inList && GetOpenMapID() != null &&
					<VMenuItem text="Find in maps" style={styles.vMenuItem}
						onClick={e=>{
							runInAction("NodeUIMenu.FindInCurrentMap", ()=>{
								store.main.search.findNode_state = "activating";
								store.main.search.findNode_node = node._key;
								store.main.search.findNode_resultPaths = [];
							});
						}}/>}
				{!inList && !componentBox &&
					<VMenuItem text={copiedNode ? <span>Cut <span style={{fontSize: 10, opacity: 0.7}}>(right-click to clear)</span></span> as any : "Cut"}
						enabled={ForCut_GetError(userID, node) == null} title={ForCut_GetError(userID, node)}
						style={styles.vMenuItem}
						onClick={e=>{
							e.persist();
							if (e.button == 2) {
								runInAction("NodeUIMenu.Cut_clear", ()=>{
									store.main.maps.copiedNodePath = null;
									store.main.maps.copiedNodePath_asCut = true;
								});
								return;
							}

							/* let pathToCut = path;
							if (node.type == MapNodeType.Claim && combinedWithParentArg) {
								pathToCut = SlicePath(path, 1);
							} */

							runInAction("NodeUIMenu.Cut", ()=>{
								store.main.maps.copiedNodePath = path;
								store.main.maps.copiedNodePath_asCut = true;
							});
						}}/>}
				{!componentBox &&
					<VMenuItem text={copiedNode ? <span>Copy <span style={{fontSize: 10, opacity: 0.7}}>(right-click to clear)</span></span> as any : "Copy"} style={styles.vMenuItem}
						enabled={ForCopy_GetError(userID, node) == null} title={ForCopy_GetError(userID, node)}
						onClick={e=>{
							e.persist();
							if (e.button == 2) {
								runInAction("NodeUIMenu.Copy_clear", ()=>{
									store.main.maps.copiedNodePath = null;
									store.main.maps.copiedNodePath_asCut = false;
								});
								return;
							}

							/* let pathToCopy = path;
							if (node.type == MapNodeType.Claim && combinedWithParentArg) {
								pathToCopy = SlicePath(path, 1);
							} */

							runInAction("NodeUIMenu.Copy", ()=>{
								store.main.maps.copiedNodePath = path;
								store.main.maps.copiedNodePath_asCut = false;
							});
						}}/>}
				<PasteAsLink_MenuItem {...sharedProps}/>
				{/* // disabled for now, since I need to create a new command to wrap the logic. One route: create a CloneNode_HighLevel command, modeled after LinkNode_HighLevel (or containing it as a sub)
					IsUserBasicOrAnon(userID) && copiedNode && IsNewLinkValid(GetParentNodeID(path), copiedNode.Extended({ _key: -1 }), permissions, holderType) && !copiedNode_asCut &&
					<VMenuItem text={`Paste as clone: "${GetNodeDisplayText(copiedNode, null, formForClaimChildren).KeepAtMost(50)}"`} style={styles.vMenuItem} onClick={async (e) => {
						if (e.button != 0) return;
						if (userID == null) return ShowSignInPopup();

						const baseNodePath = State(a => a.main.copiedNodePath);
						const baseNodePath_ids = GetPathNodeIDs(baseNodePath);
						const info = await new CloneNode({ mapID: mapID, baseNodePath, newParentID: node._id }).Run();

						store.dispatch(new ACTSetLastAcknowledgementTime({ nodeID: info.nodeID, time: Date.now() }));

						if (copiedNode_asCut) {
							await new UnlinkNode({ mapID: mapID, parentID: baseNodePath_ids.XFromLast(1), childID: baseNodePath_ids.Last() }).Run();
						}
					}}/> */}
				<UnlinkContainerArgument_MenuItem {...sharedProps}/>
				{IsUserCreatorOrMod(userID, node) && !inList && !componentBox &&
					<VMenuItem text={`Unlink${combinedWithParentArg ? " claim" : ""}`}
						enabled={ForUnlink_GetError(userID, node) == null} title={ForUnlink_GetError(userID, node)}
						style={styles.vMenuItem} onClick={async e=>{
							if (e.button != 0) return;
							/* let error = ForUnlink_GetError(userID, node);
							if (error) {
								return void ShowMessageBox({title: `Cannot unlink`, message: error});
							} */

							/* let parentNodes = await GetNodeParentsAsync(node);
							if (parentNodes.length <= 1) { */
							/* if (node.parents.VKeys().length <= 1) {
								return void ShowMessageBox({title: `Cannot unlink`, message: `Cannot unlink this child, as doing so would orphan it. Try deleting it instead.`});
							} */

							// let parent = parentNodes[0];
							const parentText = GetNodeDisplayText(parent, path.substr(0, path.lastIndexOf("/")));
							ShowMessageBox({
								title: `Unlink child "${nodeText}"`, cancelButton: true,
								message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
								onOK: ()=>{
									new UnlinkNode({mapID, parentID: parent._key, childID: node._key}).Run();
								},
							});
						}}/>}
				<DeleteContainerArgument_MenuItem {...sharedProps}/>
				<DeleteNode_MenuItem {...sharedProps}/>
			</div>
		);
	}
}

/* let PasteAsLink_MenuItem_connector = (state, {}: SharedProps)=> {
	let moveOpPayload = {};
	let valid = IsUserBasicOrAnon(MeID()) && copiedNode != null && IsMoveNodeOpValid(moveOpPayload);
	return {valid};
};
@Connect(connector)
class PasteAsLink_MenuItem extends BaseComponentWithConnector(PasteAsLink_MenuItem_connector, {}) { */
@Observer
class PasteAsLink_MenuItem extends BaseComponent<SharedProps, {}> {
	render() {
		const {map, node, path, holderType, copiedNode, copiedNodePath, copiedNode_asCut, combinedWithParentArg, inList} = this.props;
		if (!CanGetBasicPermissions(MeID())) return <div/>;
		if (copiedNode == null) return <div/>;
		if (inList) return <div/>;
		const copiedNode_parent = GetParentNodeL3(copiedNodePath);

		const formForClaimChildren = node.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base;
		const linkCommand = new LinkNode_HighLevel({
			mapID: map._key, oldParentID: GetParentNodeID(copiedNodePath), newParentID: node._key, nodeID: copiedNode._key,
			newForm: copiedNode.type == MapNodeType.Claim ? formForClaimChildren : null,
			newPolarity:
				(copiedNode.type == MapNodeType.Argument ? copiedNode.link.polarity : null) // if node itself has polarity, use it
				|| (copiedNode_parent && copiedNode_parent.type == MapNodeType.Argument ? copiedNode_parent.link.polarity : null), // else if our parent has a polarity, use that
			allowCreateWrapperArg: holderType != null || !node.multiPremiseArgument,
			unlinkFromOldParent: copiedNode_asCut, deleteOrphanedArgumentWrapper: true,
		});
		const error = linkCommand.Validate_Safe();

		return (
			<VMenuItem text={`Paste${copiedNode_asCut ? "" : " as link"}: "${GetNodeDisplayText(copiedNode, null, formForClaimChildren).KeepAtMost(50)}"`}
				enabled={error == null} title={error}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;
					if (MeID() == null) return ShowSignInPopup();

					if (copiedNode.type == MapNodeType.Argument && !copiedNode_asCut) {
						// eslint-disable-next-line
						return void ShowMessageBox({
							title: "Argument at two locations?", cancelButton: true, onOK: proceed,
							message: `
								Are you sure you want to paste this argument as a linked child?

								Only do this if you're sure that the impact-premise applies exactly the same to both the old parent and the new parent. (usually it does not, ie. usually it's specific to its original parent claim)

								If not, paste the argument as a clone instead.
							`.AsMultiline(0),
						});
					}
					proceed();

					async function proceed() {
						const {argumentWrapperID} = await linkCommand.Run();
						if (argumentWrapperID) {
							runInAction("PasteAsLink_MenuItem.proceed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(argumentWrapperID, Date.now()));
						}
					}
				}}/>
		);
	}
}

@Observer
class UnlinkContainerArgument_MenuItem extends BaseComponentPlus({} as SharedProps, {}) {
	render() {
		const {map, node, path, holderType, combinedWithParentArg} = this.props;
		if (!combinedWithParentArg) return <div/>;
		const componentBox = holderType != null;
		if (componentBox) return <div/>;

		const argumentPath = SlicePath(path, 1);
		const argument = GetNodeL3(argumentPath);
		const argumentText = GetNodeDisplayText(argument, argumentPath);
		const forUnlink_error = ForUnlink_GetError(MeID(), argument);
		if (!IsUserCreatorOrMod(MeID(), argument)) return <div/>;

		const argumentParentPath = SlicePath(argumentPath, 1);
		const argumentParent = GetNodeL3(argumentParentPath);

		return (
			<VMenuItem text="Unlink argument" enabled={forUnlink_error == null} title={forUnlink_error}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;

					ShowMessageBox({
						title: `Unlink "${argumentText}"`, cancelButton: true,
						message: `Unlink the argument "${argumentText}"?`,
						onOK: async()=>{
							new UnlinkNode({mapID: map ? map._key : null, parentID: argumentParent._key, childID: argument._key}).Run();
						},
					});
				}}/>
		);
	}
}

@Observer
class DeleteContainerArgument_MenuItem extends BaseComponent<SharedProps, {}> {
	render() {
		const {map, node, path, holderType, combinedWithParentArg} = this.props;
		const mapID = map ? map._key : null;
		if (!combinedWithParentArg) return <div/>;
		const componentBox = holderType != null;
		if (componentBox) return <div/>;

		const argumentPath = SlicePath(path, 1);
		const argument = GetNodeL3(argumentPath);
		if (argument == null) return null; // wait till loaded
		const argumentText = GetNodeDisplayText(argument, argumentPath);
		// const forDelete_error = ForDelete_GetError(MeID(), argument, { childrenToIgnore: [node._key] });
		if (!IsUserCreatorOrMod(MeID(), argument)) return null;

		/* const command = new DeleteNode({ mapID, nodeID: node._key, withContainerArgument: argument._key });
		const error = command.Validate_Safe(); */

		const canDeleteBaseClaim = IsUserCreatorOrMod(MeID(), node);
		const baseClaimCommand = node.parents.VKeys().length > 1 || !canDeleteBaseClaim
			? new UnlinkNode({mapID, parentID: argument._key, childID: node._key})
			: new DeleteNode({mapID, nodeID: node._key});

		const argumentCommand = new DeleteNode(E({mapID, nodeID: argument._key}));
		if (baseClaimCommand) {
			// temp; client isn't supposed to be able to set asSubcommand (we do it for now, since we don't have a dedicated DeleteArgument command created yet)
			argumentCommand.parentCommand = {} as any;
			argumentCommand.childrenToIgnore = [node._key];
		}
		const error = argumentCommand.Validate_Safe() ?? baseClaimCommand?.Validate_Safe();

		return (
			<VMenuItem text="Delete argument" enabled={error == null} title={error}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;

					ShowMessageBox({
						title: `Delete "${argumentText}"`, cancelButton: true,
						message: `Delete the argument "${argumentText}", and ${baseClaimCommand instanceof UnlinkNode ? "unlink" : "delete"} its base-claim?`,
						onOK: async()=>{
							// await command.Run();
							// if deleting single-premise argument, first delete or unlink the base-claim
							if (baseClaimCommand) {
								await baseClaimCommand.Run();
							}
							await argumentCommand.Run();
						},
					});
				}}/>
		);
	}
}

@Observer
class DeleteNode_MenuItem extends BaseComponentPlus({} as SharedProps, {}) {
	render() {
		const {map, node, path, holderType, combinedWithParentArg} = this.props;
		const componentBox = holderType != null;
		if (!IsUserCreatorOrMod(MeID(), node) || componentBox) return null;
		const nodeText = GetNodeDisplayText(node, path);

		const command = new DeleteNode(E({mapID: map?._key, nodeID: node._key}));

		return (
			<VMenuItem text={`Delete${combinedWithParentArg ? " claim" : ""}`}
				enabled={command.Validate_Safe() == null} title={command.validateError}
				style={styles.vMenuItem} onClick={e=>{
					if (e.button != 0) return;

					const contextStr = IsNodeSubnode(node) ? ", and its placement in-layer" : ", and its link with 1 parent";

					ShowMessageBox({
						title: `Delete "${nodeText}"`, cancelButton: true,
						message: `Delete the node "${nodeText}"${contextStr}?`,
						onOK: async()=>{
							await command.Run();
						},
					});
				}}/>
		);
	}
}
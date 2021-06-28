import {E} from "web-vcore/nm/js-vextensions";
import {runInAction} from "web-vcore/nm/mobx";
import {SlicePath} from "web-vcore/nm/mobx-graphlink";
import {BaseComponent, BaseComponentPlus, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions";
import {VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu";
import {store} from "Store";
import {GetPathsToNodesChangedSinceX} from "Store/db_ext/mapNodeEditTimes";
import {GetOpenMapID} from "Store/main";
import {ACTCopyNode, GetCopiedNode, GetCopiedNodePath} from "Store/main/maps";
import {SetNodeIsMultiPremiseArgument, ForCopy_GetError, ForCut_GetError, ForDelete_GetError, GetNodeChildrenL3, GetNodeID, GetParentNodeL3, HolderType, GetValidNewChildTypes, IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument, ClaimForm, MapNodeL3, Polarity, GetMapNodeTypeDisplayName, MapNodeType, MapNodeType_Info, MeID, GetUserPermissionGroups, IsUserCreatorOrMod, Map} from "dm_common";
import {Observer} from "web-vcore";
import {styles} from "../../../../Utils/UI/GlobalStyles";
import {ShowSignInPopup} from "../../NavBar/UserPanel";
import {ShowAddChildDialog} from "./NodeUI_Menu/Dialogs/AddChildDialog";
import {MI_DeleteContainerArgument} from "./NodeUI_Menu/MI_DeleteContainerArgument";
import {MI_DeleteNode} from "./NodeUI_Menu/MI_DeleteNode";
import {MI_ExportSubtree} from "./NodeUI_Menu/MI_ExportSubtree";
import {MI_PasteAsLink} from "./NodeUI_Menu/MI_PasteAsLink";
import {MI_UnlinkContainerArgument} from "./NodeUI_Menu/MI_UnlinkContainerArgument";
import {MI_UnlinkNode} from "./NodeUI_Menu/MI_UnlinkNode";

export class NodeUI_Menu_Stub extends BaseComponent<Props, {}> {
	render() {
		const {...rest} = this.props;
		return (
			<VMenuStub delayEventHandler={true} preOpen={e=>!e.handled}>
				<NodeUI_Menu {...rest}/>
			</VMenuStub>
		);
	}
}

type Props = {map?: Map, node: MapNodeL3, path: string, inList?: boolean, holderType?: HolderType};
export type MI_SharedProps = Props & {mapID: string, combinedWithParentArg: boolean, copiedNode: MapNodeL3, copiedNodePath: string, copiedNode_asCut: boolean};

@WarnOfTransientObjectProps
@Observer
export class NodeUI_Menu extends BaseComponentPlus({} as Props, {}) {
	render() {
		const {map, node, path, inList, holderType} = this.props;

		const parent = GetParentNodeL3(path);
		const outerPath = IsPremiseOfSinglePremiseArgument(node, parent) ? SlicePath(path, 1) : path;
		if (map) {
			//const sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
			const sinceTime = 0;
			const pathsToChangedNodes = GetPathsToNodesChangedSinceX(map.id, sinceTime);
			var pathsToChangedInSubtree = pathsToChangedNodes.filter(a=>a == outerPath || a.startsWith(`${outerPath}/`)); // also include self, for this
		}

		const copiedNode = GetCopiedNode();
		const copiedNodePath = GetCopiedNodePath();

		ForDelete_GetError(MeID(), node); // watch
		const userID = MeID();
		const permissions = GetUserPermissionGroups(userID);
		// nodeChildren: GetNodeChildrenL3(node, path),
		const nodeChildren = GetNodeChildrenL3(node.id, path);
		const combinedWithParentArg = IsPremiseOfSinglePremiseArgument(node, parent);
		const copiedNode_asCut = store.main.maps.copiedNodePath_asCut;

		const mapID = map ? map.id : null;
		// let validChildTypes = MapNodeType_Info.for[node.type].childTypes;
		let validChildTypes = GetValidNewChildTypes(node, holderType, permissions);
		const componentBox = holderType != null;
		if (holderType) {
			validChildTypes = validChildTypes.Except(MapNodeType.claim);
		} else {
			validChildTypes = validChildTypes.Except(MapNodeType.argument);
		}

		const formForClaimChildren = node.type == MapNodeType.category ? ClaimForm.yesNoQuestion : ClaimForm.base;

		const sharedProps: MI_SharedProps = E(this.props, {mapID, combinedWithParentArg, copiedNode, copiedNodePath, copiedNode_asCut});
		return (
			<div>
				{/*CanContributeToNode(userID, node.id) &&*/ !inList && validChildTypes.map(childType=>{
					const childTypeInfo = MapNodeType_Info.for[childType];
					// let displayName = GetMapNodeTypeDisplayName(childType, node, form);
					const polarities = childType == MapNodeType.argument ? [Polarity.supporting, Polarity.opposing] : [null];
					return polarities.map(polarity=>{
						const displayName = GetMapNodeTypeDisplayName(childType, node, ClaimForm.base, polarity);
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
				{IsUserCreatorOrMod(userID, parent) && node.type == MapNodeType.claim && IsSinglePremiseArgument(parent) && !componentBox &&
					<VMenuItem text="Convert to multi-premise" style={styles.vMenuItem}
						onClick={async e=>{
							if (e.button != 0) return;

							await new SetNodeIsMultiPremiseArgument({nodeID: parent.id, multiPremiseArgument: true}).Run();
						}}/>}
				{IsUserCreatorOrMod(userID, node) && IsMultiPremiseArgument(node)
					&& nodeChildren.every(a=>a != null) && nodeChildren.filter(a=>a.type == MapNodeType.claim).length == 1 && !componentBox &&
					<VMenuItem text="Convert to single-premise" style={styles.vMenuItem}
						onClick={async e=>{
							if (e.button !== 0) return;

							await new SetNodeIsMultiPremiseArgument({nodeID: node.id, multiPremiseArgument: false}).Run();
						}}/>}
				{pathsToChangedInSubtree && pathsToChangedInSubtree.length > 0 && !componentBox &&
					<VMenuItem text="Mark subtree as viewed" style={styles.vMenuItem}
						onClick={e=>{
							if (e.button != 0) return;
							for (const path of pathsToChangedInSubtree) {
								runInAction("NodeUIMenu.MarkSubtreeAsViewed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(GetNodeID(path), Date.now()));
							}
						}}/>}
				{inList &&
					<VMenuItem text="Find in maps" style={styles.vMenuItem}
						onClick={e=>{
							runInAction("NodeUIMenu.FindInCurrentMap", ()=>{
								store.main.search.findNode_state = "activating";
								store.main.search.findNode_node = node.id;
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
								ACTCopyNode(null, true);
								return;
							}

							/* let pathToCut = path;
							if (node.type == MapNodeType.claim && combinedWithParentArg) {
								pathToCut = SlicePath(path, 1);
							} */
							ACTCopyNode(path, true);
						}}/>}
				{!componentBox &&
					<VMenuItem text={copiedNode ? <span>Copy <span style={{fontSize: 10, opacity: 0.7}}>(right-click to clear)</span></span> as any : "Copy"} style={styles.vMenuItem}
						enabled={ForCopy_GetError(userID, node) == null} title={ForCopy_GetError(userID, node)}
						onClick={e=>{
							e.persist();
							if (e.button == 2) {
								ACTCopyNode(null, false);
								return;
							}

							/* let pathToCopy = path;
							if (node.type == MapNodeType.claim && combinedWithParentArg) {
								pathToCopy = SlicePath(path, 1);
							} */
							ACTCopyNode(path, false);
						}}/>}
				<MI_PasteAsLink {...sharedProps}/>
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
				<MI_ExportSubtree {...sharedProps}/>
				{/*<MI_ImportSubtree {...sharedProps}/>*/}
				<MI_UnlinkContainerArgument {...sharedProps}/>
				<MI_UnlinkNode {...sharedProps}/>
				<MI_DeleteContainerArgument {...sharedProps}/>
				<MI_DeleteNode {...sharedProps}/>
			</div>
		);
	}
}
import {Clone, E, GetValues} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {GetAsync, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {BaseComponent, BaseComponentPlus, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu.js";
import {store} from "Store";
import {GetPathsToNodesChangedSinceX} from "Store/db_ext/mapNodeEdits.js";
import {GetOpenMapID} from "Store/main";
import {ACTCopyNode, GetCopiedNode, GetCopiedNodePath} from "Store/main/maps";
import {SetNodeIsMultiPremiseArgument, ForCopy_GetError, ForCut_GetError, ForDelete_GetError, GetNodeChildrenL3, GetNodeID, GetParentNodeL3, ChildGroup, GetValidNewChildTypes, IsMultiPremiseArgument, IsPremiseOfSinglePremiseArgument, IsSinglePremiseArgument, ClaimForm, NodeL3, Polarity, GetNodeTypeDisplayName, NodeType, NodeType_Info, MeID, GetUserPermissionGroups, IsUserCreatorOrMod, Map, GetChildLayout_Final, GetNodeDisplayText} from "dm_common";
import {ES, Observer, RunInAction} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import React from "react";
import {ShowSignInPopup} from "../../NavBar/UserPanel.js";
import {ShowAddChildDialog} from "./NodeUI_Menu/Dialogs/AddChildDialog.js";
import {MI_DeleteContainerArgument} from "./NodeUI_Menu/MI_DeleteContainerArgument.js";
import {MI_DeleteNode} from "./NodeUI_Menu/MI_DeleteNode.js";
import {MI_ExportSubtree} from "./NodeUI_Menu/MI_ExportSubtree.js";
import {MI_Paste} from "./NodeUI_Menu/MI_Paste.js";
import {MI_CloneNode} from "./NodeUI_Menu/MI_CloneNode.js";
import {MI_UnlinkContainerArgument} from "./NodeUI_Menu/MI_UnlinkContainerArgument.js";
import {MI_UnlinkNode} from "./NodeUI_Menu/MI_UnlinkNode.js";
import {MI_ImportSubtree} from "./NodeUI_Menu/MI_ImportSubtree.js";
import {MI_MoveUpOrDown} from "./NodeUI_Menu/MI_MoveUpOrDown.js";
import {MI_Paste_Old} from "./NodeUI_Menu/MI_Paste_Old.js";
import {MI_CloneSubtree} from "./NodeUI_Menu/MI_CloneSubtree.js";

export class NodeUI_Menu_Stub extends BaseComponent<Props & {delayEventHandler?: boolean}, {}> {
	render() {
		const {delayEventHandler, ...rest} = this.props;
		return (
			<VMenuStub delayEventHandler={delayEventHandler ?? true} preOpen={e=>!e.handled}>
				<NodeUI_Menu {...rest}/>
			</VMenuStub>
		);
	}
}

type Props = {map?: Map, node: NodeL3, path: string, inList?: boolean, childGroup: ChildGroup};
export type MI_SharedProps = Props & {mapID: string|n, combinedWithParentArg: boolean, copiedNode: NodeL3|n, copiedNodePath: string|n, copiedNode_asCut: boolean};

@WarnOfTransientObjectProps
@Observer
export class NodeUI_Menu extends BaseComponentPlus({} as Props, {}) {
	render() {
		const {map, node, path, inList, childGroup} = this.props;

		const parent = GetParentNodeL3(path);
		const isPremiseOfSinglePremiseArg = IsPremiseOfSinglePremiseArgument(node, parent);
		const outerNode = isPremiseOfSinglePremiseArg ? parent : node;
		const outerPath = isPremiseOfSinglePremiseArg ? SlicePath(path, 1) : path;

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
		const forChildHolderBox = childGroup != ChildGroup.generic;

		const formForClaimChildren = node.type == NodeType.category ? ClaimForm.question : ClaimForm.base;

		const sharedProps: MI_SharedProps = E(this.props, {mapID, combinedWithParentArg, copiedNode, copiedNodePath, copiedNode_asCut});
		//const childLayout_forStructuredHeaders = addChildGroups_structured.length <= 1 ? "below" : "right";
		const childLayout_forStructuredHeaders = "right";
		const headerStyle = ES(liveSkin.Style_VMenuItem(), {opacity: 1});

		const GetAddChildItems = (node2: NodeL3, path2: string, childGroup2: ChildGroup)=>{
			const validChildTypes = GetValidNewChildTypes(node2, childGroup2, permissions);
			if (validChildTypes.length == 0) return null;

			//if (!CanContributeToNode(userID, node.id)) return null;
			if (inList) return null;

			return <>
				{validChildTypes.map(childType=>{
					const childTypeInfo = NodeType_Info.for[childType];
					//let displayName = GetNodeTypeDisplayName(childType, node, form);
					const polarities = childType == NodeType.argument ? [Polarity.supporting, Polarity.opposing] : [null];
					return polarities.map(polarity=>{
						const displayName = GetNodeTypeDisplayName(childType, node2, ClaimForm.base, polarity);
						return (
							<VMenuItem key={`${childType}_${polarity}`} text={`New ${displayName}`} style={liveSkin.Style_VMenuItem()}
								onClick={e=>{
									if (e.button != 0) return;
									if (userID == null) return ShowSignInPopup();
									ShowAddChildDialog(path2, childType, polarity, userID, childGroup2, mapID);
								}}/>
						);
					});
				})}
				{/*<VMenuItem text={`Paste (advanced)`} enabled={false} style={headerStyle}>
					<VMenuItem text={`As link, directly`} style={styles.vMenuItem}/>
					<VMenuItem text={`As link, in new argument`} style={styles.vMenuItem}/>
					<VMenuItem text={`As clone, in new argument`} style={styles.vMenuItem}/>
				</VMenuItem>*/}
			</>;
		};
		const addChildItems_structured_generic = childGroup.IsOneOf("generic") && GetAddChildItems(node, path, ChildGroup.generic);
		const addChildItems_structured_truth = childGroup.IsOneOf("generic", "truth") && GetAddChildItems(node, path, ChildGroup.truth);
		const addChildItems_structured_relevance =
			(childGroup.IsOneOf("generic", "relevance") && GetAddChildItems(node, path, ChildGroup.relevance)) ||
			(childGroup == "generic" && isPremiseOfSinglePremiseArg && GetAddChildItems(outerNode!, outerPath!, ChildGroup.relevance));
		const addChildItems_freeform = childGroup.IsOneOf("generic", "freeform") && GetAddChildItems(node, path, ChildGroup.freeform);
		const addChildGroups_structured = [addChildItems_structured_generic, addChildItems_structured_truth, addChildItems_structured_relevance].filter(a=>a);
		const addChildGroups = [...addChildGroups_structured, addChildItems_freeform].filter(a=>a);
		//const multipleAddChildGroups = addChildGroups.length > 1;
		const multipleAddChildGroups = true;

		const childLayout = GetChildLayout_Final(node.current, map);
		return (
			<>
				{multipleAddChildGroups && addChildItems_structured_generic &&
					<VMenuItem text={`Add structured child`} childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>{addChildItems_structured_generic}</VMenuItem>}
				{multipleAddChildGroups && addChildItems_structured_truth &&
					<VMenuItem text={`Add structured child (re. truth)`} childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>{addChildItems_structured_truth}</VMenuItem>}
				{multipleAddChildGroups && addChildItems_structured_relevance &&
					<VMenuItem text={`Add structured child (re. relevance)`} childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>{addChildItems_structured_relevance}</VMenuItem>}
				{multipleAddChildGroups && addChildItems_freeform &&
					<VMenuItem text={`Add freeform child`} enabled={false} style={headerStyle}>{addChildItems_freeform}</VMenuItem>}
				{/*!multipleAddChildGroups &&
					<VMenuItem text={`Add child`} style={styles.vMenuItem}>{addChildGroups[0]}</VMenuItem>*/}
				{!multipleAddChildGroups &&
					addChildGroups[0]}
				{!inList && !forChildHolderBox &&
					<VMenuItem text={<span>Cut <span style={{fontSize: 10, opacity: 0.7}}>(for moving node elsewhere)</span></span> as any}
						enabled={ForCut_GetError(userID, node) == null} title={ForCut_GetError(userID, node)}
						style={liveSkin.Style_VMenuItem()}
						onClick={e=>{
							e.persist();
							if (e.button == 2) {
								ACTCopyNode(null, true);
								return;
							}

							const pathToCut = path;
							/*if (node.type == NodeType.claim && combinedWithParentArg) {
								pathToCut = SlicePath(path, 1)!;
							}*/
							ACTCopyNode(pathToCut, true);
						}}/>}
				{!forChildHolderBox &&
					<VMenuItem text={<span>Copy <span style={{fontSize: 10, opacity: 0.7}}>(for linking to 2nd location)</span></span> as any} style={liveSkin.Style_VMenuItem()}
						enabled={ForCopy_GetError(userID, node) == null} title={ForCopy_GetError(userID, node)}
						onClick={e=>{
							e.persist();
							if (e.button == 2) {
								ACTCopyNode(null, false);
								return;
							}

							const pathToCopy = path;
							/*if (node.type == NodeType.claim && combinedWithParentArg) {
								pathToCopy = SlicePath(path, 1)!;
							}*/
							ACTCopyNode(pathToCopy, false);
						}}/>}
				{copiedNode &&
					<VMenuItem text={`Paste: "${GetNodeDisplayText(copiedNode, undefined, formForClaimChildren).KeepAtMost(50)}"`} childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>
						{multipleAddChildGroups && addChildItems_structured_generic && <MI_Paste_Old {...sharedProps} node={node} path={path} childGroup={ChildGroup.generic}/>}
						{multipleAddChildGroups && addChildItems_structured_truth && <MI_Paste_Old {...sharedProps} node={node} path={path} childGroup={ChildGroup.truth}/>}
						{multipleAddChildGroups && addChildItems_structured_relevance && <MI_Paste_Old {...sharedProps} node={node} path={path} childGroup={ChildGroup.relevance}/>}
						{multipleAddChildGroups && addChildItems_freeform && <MI_Paste_Old {...sharedProps} node={node} path={path} childGroup={ChildGroup.freeform}/>}
					</VMenuItem>}
				{/*<MI_Paste {...sharedProps} node={node} path={path} childGroup={childGroup}/>*/}
				<MI_CloneNode {...sharedProps} node={node} path={path} childGroup={childGroup}/>
				{IsUserCreatorOrMod(userID, parent) && node.type == NodeType.claim && IsSinglePremiseArgument(parent) && !forChildHolderBox &&
					<VMenuItem text="Convert to multi-premise" style={liveSkin.Style_VMenuItem()}
						onClick={async e=>{
							if (e.button != 0) return;

							await new SetNodeIsMultiPremiseArgument({nodeID: parent!.id, multiPremiseArgument: true}).RunOnServer();
						}}/>}
				{IsUserCreatorOrMod(userID, node) && IsMultiPremiseArgument(node)
					&& nodeChildren.every(a=>a != null) && nodeChildren.filter(a=>a.type == NodeType.claim).length == 1 && !forChildHolderBox &&
					<VMenuItem text="Convert to single-premise" style={liveSkin.Style_VMenuItem()}
						onClick={async e=>{
							if (e.button !== 0) return;

							await new SetNodeIsMultiPremiseArgument({nodeID: node.id, multiPremiseArgument: false}).RunOnServer();
						}}/>}
				{// this is too slow, checking the paths merely when right-clicking; instead, just always have the option visible, and delay the path-finding till when clicking it
				/*pathsToChangedInSubtree && pathsToChangedInSubtree.length > 0 && !forChildHolderBox &&
					<VMenuItem text="Mark subtree as viewed" style={liveSkin.Style_VMenuItem()}
						onClick={e=>{
							if (e.button != 0) return;
							for (const path of pathsToChangedInSubtree) {
								RunInAction("NodeUIMenu.MarkSubtreeAsViewed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(GetNodeID(path), Date.now()));
							}
						}}/>*/}
				{map && !forChildHolderBox &&
				<VMenuItem text="Mark subtree as viewed" style={liveSkin.Style_VMenuItem()}
					onClick={async e=>{
						if (e.button != 0) return;
						//const sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
						const sinceTime = 0;
						const pathsToChangedNodes = await GetAsync(()=>GetPathsToNodesChangedSinceX(map.id, sinceTime), {maxIterations: 1000}); // this can take a lot of iterations...
						const pathsToChangedInSubtree = pathsToChangedNodes.filter(a=>a == outerPath || a.startsWith(`${outerPath}/`)); // also include self, for this
						for (const path2 of pathsToChangedInSubtree) {
							RunInAction("NodeUIMenu.MarkSubtreeAsViewed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(GetNodeID(path2), Date.now()));
						}
					}}/>}
				{inList &&
					<VMenuItem text="Find in maps" style={liveSkin.Style_VMenuItem()}
						onClick={e=>{
							RunInAction("NodeUIMenu.FindInCurrentMap", ()=>{
								store.main.search.findNode_state = "activating";
								store.main.search.findNode_node = node.id;
								store.main.search.findNode_resultPaths = [];
							});
						}}/>}
				{/*IsUserCreatorOrMod(userID, node) && !forChildHolderBox && map?.extras.allowSpecialChildLayouts &&
					<VMenuItem text={`Toggle children layout (${childLayout} -> ${InvertChildLayout(childLayout)})`} style={styles.vMenuItem}
						onClick={async e=>{
							const newRevision = Clone(node.current) as NodeRevision;
							newRevision.displayDetails = {...newRevision.displayDetails, childLayout: InvertChildLayout(childLayout)};
							const revisionID = await new AddNodeRevision({mapID: map?.id, revision: newRevision}).RunOnServer();
							RunInAction("ToggleChildrenLayout", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now()));
						}}/>*/}
				<VMenuItem text="Advanced" childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>
					<MI_MoveUpOrDown direction="up" {...sharedProps}/>
					<MI_MoveUpOrDown direction="down" {...sharedProps}/>
					<MI_CloneSubtree {...sharedProps}/>
					<MI_ImportSubtree {...sharedProps}/>
					<MI_ExportSubtree {...sharedProps}/>
				</VMenuItem>
				<MI_UnlinkContainerArgument {...sharedProps}/>
				<MI_UnlinkNode {...sharedProps}/>
				<MI_DeleteContainerArgument {...sharedProps}/>
				<MI_DeleteNode {...sharedProps}/>
			</>
		);
	}
}
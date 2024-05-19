import {Clone, E, GetValues} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {GetAsync, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {BaseComponent, BaseComponentPlus, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu.js";
import {store} from "Store";
import {GetPathsToNodesChangedSinceX} from "Store/db_ext/mapNodeEdits.js";
import {GetOpenMapID} from "Store/main";
import {ACTCopyNode, GetCopiedNode, GetCopiedNodePath} from "Store/main/maps";
import {ForCopy_GetError, ForCut_GetError, CheckUserCanDeleteNode, GetNodeChildrenL3, GetNodeID, GetParentNodeL3, ChildGroup, ClaimForm, NodeL3, Polarity, NodeType, NodeType_Info, MeID, GetUserPermissionGroups, IsUserCreatorOrMod, Map, GetChildLayout_Final, GetNodeDisplayText, Me, GetValidNewChildConfigsUnderParent, GetDisplayTextForNewChildConfig} from "dm_common";
import {ES, Observer, RunInAction} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import React from "react";
import {ShowSignInPopup} from "../../NavBar/UserPanel.js";
import {ShowAddChildDialog} from "./NodeUI_Menu/Dialogs/AddChildDialog.js";
import {MI_DeleteNode} from "./NodeUI_Menu/MI_DeleteNode.js";
import {MI_SubtreeOps} from "./NodeUI_Menu/MI_SubtreeOps.js";
import {MI_Paste} from "./NodeUI_Menu/MI_Paste.js";
import {MI_CloneNode} from "./NodeUI_Menu/MI_CloneNode.js";
import {MI_UnlinkNode} from "./NodeUI_Menu/MI_UnlinkNode.js";
import {MI_ImportSubtree} from "./NodeUI_Menu/MI_ImportSubtree.js";
import {MI_MoveUpOrDown} from "./NodeUI_Menu/MI_MoveUpOrDown.js";
import {MI_Paste_Old} from "./NodeUI_Menu/MI_Paste_Old.js";
import {MI_CloneSubtree} from "./NodeUI_Menu/MI_CloneSubtree.js";
import {SLMode, SLMode_SFI} from "../../../@SL/SL.js";

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

type Props = {map?: Map, node: NodeL3, path: string};
export type MI_SharedProps = Props & {mapID: string|n, copiedNode: NodeL3|n, copiedNodePath: string|n, copiedNode_asCut: boolean};

@WarnOfTransientObjectProps
@Observer
export class NodeUI_Menu extends BaseComponent<Props, {}> {
	render() {
		const {map, node, path} = this.props;
		const mapID = map ? map.id : null;
		const user = Me();
		const userID = MeID();
		const copiedNode = GetCopiedNode();
		const copiedNodePath = GetCopiedNodePath();
		const copiedNode_asCut = store.main.maps.copiedNodePath_asCut;
		CheckUserCanDeleteNode(MeID(), node); // for mobx watching

		const formForClaimChildren = node.type == NodeType.category ? ClaimForm.question : ClaimForm.base;

		const sharedProps: MI_SharedProps = E(this.props, {mapID, copiedNode, copiedNodePath, copiedNode_asCut});
		//const childLayout_forStructuredHeaders = addChildGroups_structured.length <= 1 ? "below" : "right";
		const childLayout_forStructuredHeaders = "right";
		const headerStyle = ES(liveSkin.Style_VMenuItem(), {opacity: 1});

		// add/paste child menu-items
		// ==========

		const validAddChildConfigs = map != null ? GetValidNewChildConfigsUnderParent(node.id, user) : [];
		const addChildConfigsToShow = validAddChildConfigs.filter(config=>{
			// if config is for a claim with a polarity: this is technically valid, but only show it when in sl-mode (since this is not the standard/desired way to structure arguments in debate-map)
			if (config.childType == NodeType.claim && !config.addWrapperArg && config.polarity != null && !SLMode) return false;
			// if config is for a claim, in a wrapper-arg (which has a polarity): this is technically valid, but don't show it, because it's functionality equivalent to the config for a new argument
			if (config.childType == NodeType.claim && config.addWrapperArg && config.polarity != null) return false;
			return true;
		});
		const addChildConfigsToShow_uis = addChildConfigsToShow.map((c, i)=>{
			const childTypeInfo = NodeType_Info.for[c.childType];
			//let displayName = GetNodeTypeDisplayName(childType, node, form);
			//const displayName = GetNodeTypeDisplayName(c.childType, node, ClaimForm.base, c.polarity);
			const displayName = GetDisplayTextForNewChildConfig(node, c, false, {});
			return (
				<VMenuItem key={i} text={`New ${displayName}`} style={liveSkin.Style_VMenuItem()}
					onClick={e=>{
						if (e.button != 0) return;
						if (userID == null) return ShowSignInPopup();
						ShowAddChildDialog(path, c, userID, mapID);
					}}/>
			);
		});

		const validPasteChildConfigs = map != null ? GetValidNewChildConfigsUnderParent(node.id, user).filter(a=>a.childType == copiedNode?.type) : [];
		const pasteChildConfigsToShow = validPasteChildConfigs.filter(config=>{
			// if config is for a claim with a polarity: this is technically valid, but only show it when in sl-mode (since this is not the standard/desired way to structure arguments in debate-map)
			if (config.childType == NodeType.claim && !config.addWrapperArg && config.polarity != null && !SLMode) return false;
			return true;
		});
		const pasteChildConfigsToShow_uis = pasteChildConfigsToShow.map((c, i)=>{
			return (
				<MI_Paste_Old key={i} {...sharedProps} node={node} path={path} config={c}/>
			);
		});

		const getAddChildMenuItemsForGroup = (childGroup: ChildGroup)=>addChildConfigsToShow_uis.filter((ui, i)=>addChildConfigsToShow[i].childGroup == childGroup);
		const getPasteChildMenuItemsForGroup = (childGroup: ChildGroup)=>pasteChildConfigsToShow_uis.filter((ui, i)=>{
			if (SLMode_SFI && childGroup != ChildGroup.freeform) return false; // in sl-mode-sfi, only allow "paste as freeform" options
			return pasteChildConfigsToShow[i].childGroup == childGroup;
		});
		const addChildItems_structured_generic = getAddChildMenuItemsForGroup(ChildGroup.generic);
		const addChildItems_structured_truth = getAddChildMenuItemsForGroup(ChildGroup.truth);
		const addChildItems_structured_relevance = getAddChildMenuItemsForGroup(ChildGroup.relevance);
		const addChildItems_freeform = getAddChildMenuItemsForGroup(ChildGroup.freeform);
		const pasteChildItems_structured_generic = getPasteChildMenuItemsForGroup(ChildGroup.generic);
		const pasteChildItems_structured_truth = getPasteChildMenuItemsForGroup(ChildGroup.truth);
		const pasteChildItems_structured_relevance = getPasteChildMenuItemsForGroup(ChildGroup.relevance);
		const pasteChildItems_freeform = getPasteChildMenuItemsForGroup(ChildGroup.freeform);

		// jsx render tree
		// ==========

		const childLayout = GetChildLayout_Final(node.current, map);
		return (
			<>
				{addChildItems_structured_generic.length > 0 && !SLMode_SFI &&
					<VMenuItem text={`Add structured child`} childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>{addChildItems_structured_generic}</VMenuItem>}
				{addChildItems_structured_truth.length > 0 && !SLMode_SFI &&
					<VMenuItem text={`Add structured child (re. truth)`} childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>{addChildItems_structured_truth}</VMenuItem>}
				{addChildItems_structured_relevance.length > 0 && !SLMode_SFI &&
					<VMenuItem text={`Add structured child (re. relevance)`} childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>{addChildItems_structured_relevance}</VMenuItem>}
				{addChildItems_freeform.length > 0 &&
					<VMenuItem text={`Add freeform child`} enabled={false} style={headerStyle}>{addChildItems_freeform}</VMenuItem>}
				{map != null &&
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
				{!SLMode_SFI &&
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
					<VMenuItem text={`Paste: "${GetNodeDisplayText(copiedNode, null, map, formForClaimChildren).KeepAtMost(50)}"`} childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>
						{pasteChildItems_structured_generic}
						{pasteChildItems_structured_truth}
						{pasteChildItems_structured_relevance}
						{pasteChildItems_freeform.length > 0 && SLMode_SFI && // in sl-mode-sfi, there are *only* freeform paste options atm; so don't group them under a "Freeform" parent
							pasteChildItems_freeform}
						{pasteChildItems_freeform.length > 0 && !SLMode_SFI &&
							<VMenuItem text={`Freeform...`} enabled={false} style={headerStyle}>{pasteChildItems_freeform}</VMenuItem>}
					</VMenuItem>}
				{/*<MI_Paste {...sharedProps} node={node} path={path} childGroup={childGroup}/>*/}
				{!SLMode_SFI && <MI_CloneNode {...sharedProps} node={node} path={path}/>}
				{map && !SLMode_SFI &&
					<VMenuItem text="Mark subtree as viewed" style={liveSkin.Style_VMenuItem()}
						onClick={async e=>{
							if (e.button != 0) return;
							//const sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
							const sinceTime = 0;
							// we used to calculate this during menu render, but that slowed down the rendering too much
							const pathsToChangedNodes = await GetAsync(()=>GetPathsToNodesChangedSinceX(map.id, sinceTime), {maxIterations: 1000}); // this can take a lot of iterations...
							const pathsToChangedInSubtree = pathsToChangedNodes.filter(a=>a == path || a.startsWith(`${path}/`)); // also include self, for this
							for (const path2 of pathsToChangedInSubtree) {
								RunInAction("NodeUIMenu.MarkSubtreeAsViewed", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(GetNodeID(path2), Date.now()));
							}
						}}/>}
				{map == null && // todo: probably replace this (in search results) with the "Find" button approach (as seen on Stream panel)
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
				{!SLMode_SFI &&
				<VMenuItem text="Advanced" childLayout={childLayout_forStructuredHeaders} enabled={false} style={headerStyle}>
					<MI_MoveUpOrDown direction="up" {...sharedProps}/>
					<MI_MoveUpOrDown direction="down" {...sharedProps}/>
					<MI_CloneSubtree {...sharedProps}/>
					<MI_ImportSubtree {...sharedProps}/>
					<MI_SubtreeOps {...sharedProps}/>
				</VMenuItem>}
				{!SLMode_SFI && <MI_UnlinkNode {...sharedProps}/>}
				<MI_DeleteNode {...sharedProps}/>
			</>
		);
	}
}
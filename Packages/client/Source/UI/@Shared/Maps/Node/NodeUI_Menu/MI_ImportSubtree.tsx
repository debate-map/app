import {AsNodeL1Input, ChildGroup, HasAdminPermissions, MeID} from "dm_common";
import React from "react";
import {VMenuItem} from "react-vmenu";
import {ShowMessageBox} from "react-vmessagebox";
import {store} from "Store";
import {IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat.js";
import {RunCommand_AddChildNode} from "Utils/DB/Command.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {ImportSubtreeUI} from "./Dialogs/ImportSubtreeDialog.js";
import {observer_mgl} from "mobx-graphlink";

export const MI_ImportSubtree = observer_mgl((props: MI_SharedProps)=>{
	const {map, node} = props;
	if (map == null) return null;
	const sharedProps = props as MI_SharedProps;
	if (!HasAdminPermissions(MeID())) return null;
	const childGroup = node.link?.group;

	const uiState = store.main.maps.importSubtreeDialog;
	const selectedIRs_nodeAndRev = [...uiState.selectedImportResources].filter(a=>a instanceof IR_NodeAndRevision) as IR_NodeAndRevision[];

	return (
		<>
			<VMenuItem text="Import subtree" style={liveSkin.Style_VMenuItem()} onClick={async e=>{
				if (e.button != 0) return;
				let ui: ImportSubtreeUI|n;
				const controller = ShowMessageBox({
					title: `Import subtree`,
					okButton: false, buttonBarStyle: {display: "none"},

					// don't use overlay/background-blocker
					overlayStyle: {background: "none", pointerEvents: "none"},
					containerStyle: {pointerEvents: "auto"},

					// also make fully opaque; this dialog has complex content, so we need max readability
					//containerStyle: {pointerEvents: "auto", backgroundColor: "rgba(255,255,255,1) !important"}, // commented; this way doesn't work

					message: ()=>{
						// style block is a hack-fix for to make this dialog fully opaque (its content is complex, so we need max readability)
						return <>
							<style>{`
								.ReactModal__Content:not(.neverMatch) { background-color: rgba(255,255,255,1) !important; }
							`}</style>
							<ImportSubtreeUI ref={c=>{ui = c}} {...sharedProps} {...{controller}}/>
						</>;
					},
				});
				//this.lastController = controller;
			}}/>
			{selectedIRs_nodeAndRev.length > 0 &&
			<VMenuItem text="Recreate import-node here (1st)" style={liveSkin.Style_VMenuItem()} onClick={async e=>{
				if (e.button != 0) return;
				const res = selectedIRs_nodeAndRev[0];
				/*if (res.node.type == NodeType.argument) {
					const command = new AddArgumentAndClaim({
						mapID: map?.id,
						argumentParentID: node.id, argumentNode: res.node, argumentRevision: res.revision, argumentLink: res.link,
						claimNode: this.subNode!, claimRevision: this.subNode_revision!, claimLink: this.subNode_link,
					});
					command.RunOnServer();
				} else {*/
				res.link.group = childGroup ?? ChildGroup.generic;
				await RunCommand_AddChildNode({mapID: map?.id, parentID: node.id, node: AsNodeL1Input(res.node), revision: res.revision, link: res.link});
			}}/>}
		</>
	);
});

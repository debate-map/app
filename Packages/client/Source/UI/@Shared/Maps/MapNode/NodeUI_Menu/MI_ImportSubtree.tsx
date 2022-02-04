import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {InfoButton, Observer, RunInAction, RunInAction_Set, TreeView} from "web-vcore";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox, BoxController} from "web-vcore/nm/react-vmessagebox.js";
import {Column, Row, TextArea, Button, CheckBox, Select, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {FromJSON, ToJSON, CE, Clone, GetEntries, ModifyString} from "web-vcore/nm/js-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {runInAction} from "web-vcore/nm/mobx.js";
import {HasModPermissions, HasAdminPermissions, MeID, GetNodeID, AddChildNode} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import React, {useReducer, useState} from "react";
import {Command} from "mobx-graphlink";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {FS_MapNode, FS_MapNodeL3} from "./SubtreeImportExport/FSDataModel/FS_MapNode.js";
import {GetResourcesInImportSubtree, ImportResource, IR_NodeAndRevision} from "./SubtreeImportExport/FSImportHelpers.js";

@Observer
export class MI_ImportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
	//lastController: BoxController;
	render() {
		const sharedProps = this.props as MI_SharedProps;
		if (!HasAdminPermissions(MeID())) return null;

		const uiState = store.main.maps.importSubtreeDialog;
		return (
			<>
				<VMenuItem text="Import subtree" style={liveSkin.Style_VMenuItem()} onClick={async e=>{
					if (e.button != 0) return;
					let ui: ImportSubtreeUI|n;
					const controller = ShowMessageBox({
						title: `Import subtree`,
						okButton: false, buttonBarStyle: {display: "none"},

						// make-so dialog does not block input to rest of UI
						overlayStyle: {background: "none", pointerEvents: "none"},
						containerStyle: {pointerEvents: "auto"},

						message: ()=><ImportSubtreeUI ref={c=>ui = c} {...sharedProps} {...{controller}}/>,
					});
					//this.lastController = controller;
				}}/>
				{uiState.selectedImportResource instanceof IR_NodeAndRevision &&
				<VMenuItem text="Recreate import-node here" style={liveSkin.Style_VMenuItem()} onClick={async e=>{
					if (e.button != 0) return;
					// todo
				}}/>}
			</>
		);
	}
}

enum ImportSubtreeUI_LeftTab {
	json = "json",
	options = "options",
}
enum ImportSubtreeUI_RightTab {
	resources = "resources",
}

@Observer
class ImportSubtreeUI extends BaseComponentPlus(
	{} as {controller: BoxController} & MI_SharedProps,
	{
		leftTab: ImportSubtreeUI_LeftTab.json,
		rightTab: ImportSubtreeUI_RightTab.resources,
		showLeftPanel: true,
		subtreeJSON: "",
		subtreeData: null as FS_MapNodeL3|n,
		process: false,
		subtreeJSON_parseError: null as string|n,
	},
	) {
	render() {
		const {mapID, node, path, controller} = this.props;
		const {subtreeJSON, subtreeData, process, leftTab, rightTab, showLeftPanel, subtreeJSON_parseError} = this.state;
		const dialogState = store.main.maps.importSubtreeDialog;

		let resources: ImportResource[] = [];
		if (process && subtreeData != null) {
			resources = GetResourcesInImportSubtree(subtreeData);
		}

		return (
			<Column style={{width: showLeftPanel ? 1200 : 700, height: 700}}>
				<Row style={{flex: 1, minHeight: 0}}>
					{showLeftPanel &&
					<Column style={{width: 500}}>
						<Row>
							<Select displayType="button bar" options={GetEntries(ImportSubtreeUI_LeftTab, "ui")} value={leftTab} onChange={val=>this.SetState({leftTab: val})}/>
						</Row>
						{leftTab == ImportSubtreeUI_LeftTab.json &&
						<>
							<Row>
								<Row center style={{flex: 1}}>
									<Text>Subtree JSON:</Text>
									<InfoButton ml={5} text={`
										Obtain this subtree-json by:
										1) In the old, firestore-based version of Debate Map, right click the subtree you want, and press "Export subtree".
										2) Set your settings, press "Get data", then wait a few seconds for the data to be retrieved.
										3) Open dev-tools panel, open Source tab, press ctrl+o, type "MI_ExportSubtree.js", and open the file found. (if not found, turn on "Enable JavaScript source maps" in dev-tools F1/options panel) 
										4) Place a breakpoint on line 70 (right after the "var subtree = ..." line), by clicking on the line-number label.
										5) Change the "Base export depth" up or down 1, to trigger the code to run again; your breakpoint should get hit.
										6) Export the subtree variable's data to a file, by running this in the dev-tools Console tab: \`RR().StartDownload(JSON.stringify(subtree, null, 2), "Export_" + Date.now() + ".json");\`
										7) Open the downloaded file, select all of its text, copy it, and paste it into the "Subtree JSON" text-box below.
									`.AsMultiline(0)}/>
								</Row>
								<Row center style={{flex: 1}}>
									<Text>Validity:</Text>
									{subtreeJSON_parseError == null &&
									<Text ml={5}>valid</Text>}
									{subtreeJSON_parseError != null &&
									<>
										<Text ml={5}>invalid</Text>
										<InfoButton ml={5} sel text={subtreeJSON_parseError.toString()}/>
									</>}
								</Row>
							</Row>
							<TextArea value={subtreeJSON} style={{flex: 1}} onChange={val=>{
								let subtreeData_new: FS_MapNodeL3|n = null;
								try {
									subtreeData_new = FromJSON(subtreeJSON) as FS_MapNodeL3;
									this.SetState({subtreeJSON_parseError: null});
								} catch (err) {
									this.SetState({subtreeJSON_parseError: err});
								}
								this.SetState({
									subtreeJSON: val,
									subtreeData: subtreeData_new,
								});
							}}/>
						</>}
						{leftTab == ImportSubtreeUI_LeftTab.options &&
						<>
							{/*<Row>
								<CheckBox text="Import ratings, from users:" value={dialogState.importRatings}
									onChange={val=>RunInAction("MI_ImportSubtree.importRatings.onChange", ()=>dialogState.importRatings = val)}/>
								<TextInput ml={5} placeholder="Leave empty for all users..." style={{flex: 1}} value={dialogState.importRatings_userIDsStr}
									onChange={val=>RunInAction("MI_ImportSubtree.importRatings_userIDsStr.onChange", ()=>dialogState.importRatings_userIDsStr = val)}/>
							</Row>
							<ScrollView style={ES({flex: 1})}>
								{subtreeData &&
									<SubtreeTreeView node={subtreeData} path={[subtreeData.id]} nodesToLink={nodesToLink} setNodesToLink={val=>this.SetState({nodesToLink: val})}/>}
							</ScrollView>*/}
						</>}
					</Column>}
					<Column style={{width: 700, padding: "0 5px"}}>
						<Row>
							<Select displayType="button bar" options={GetEntries(ImportSubtreeUI_RightTab, "ui")} value={rightTab} onChange={val=>this.SetState({rightTab: val})}/>
							<CheckBox ml={5} text="Show left panel" value={showLeftPanel} onChange={val=>this.SetState({showLeftPanel: val})}/>
						</Row>
						{rightTab == ImportSubtreeUI_RightTab.resources &&
						<>
							<Row>
								<CheckBox text="Start extracting resources" value={process} onChange={val=>this.SetState({process: val})}/>
							</Row>
							<ScrollView>
								{resources.map((resource, index)=>{
									return <ImportResourceUI key={index} {...{resource, index}}/>;
								})}
							</ScrollView>
						</>}
					</Column>
				</Row>
				<Row mt={5}>
					<Button ml="auto" text="Close" onClick={()=>{
						controller.Close();
					}}/>
				</Row>
			</Column>
		);
	}
}

@Observer
class ImportResourceUI extends BaseComponent<{resource: ImportResource, index: number}, {}> {
	render() {
		const {resource, index} = this.props;
		const uiState = store.main.maps.importSubtreeDialog;
		const pathStr = resource.path.join("."); //+ (resource.path.length > 0 ? "." : "");
		return (
			<Row mt={index == 0 ? 0 : 5} sel style={{border: "solid gray", borderWidth: index == 0 ? 0 : "1px 0 0 0"}}>
				{resource instanceof IR_NodeAndRevision &&
				<>
					<Text style={{flexShrink: 0, fontWeight: "bold", padding: "0 3px", background: "rgba(128,128,128,.5)", marginBottom: -5}}>{pathStr}</Text>
					<Text ml={5} mr={5} style={{flex: 1, display: "block"}}>
						<Text mr={3} style={{display: "inline-block", flexShrink: 0, fontWeight: "bold"}}>{ModifyString(resource.node.type, m=>[m.startLower_to_upper])}:</Text>
						{resource.revision.phrasing.text_base}
					</Text>
				</>}
				<CheckBox ml="auto" text="Selected" style={{flexShrink: 0}} value={uiState.selectedImportResource == resource} onChange={val=>{
					const newResource = val ? resource : null;
					RunInAction_Set(this, ()=>uiState.selectedImportResource = newResource);
				}}/>
			</Row>
		);
	}
}
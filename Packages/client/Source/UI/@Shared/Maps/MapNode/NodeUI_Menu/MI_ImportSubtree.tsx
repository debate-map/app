import {AddChildNode, HasAdminPermissions, MapNodeType, MeID, Polarity} from "dm_common";
import React, {ComponentProps} from "react";
import {store} from "Store";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {ES, InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {gql} from "web-vcore/nm/@apollo/client";
import {FromJSON, GetEntries, ModifyString} from "web-vcore/nm/js-vextensions.js";
import {Button, CheckBox, Column, Row, Select, Text, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {FS_MapNodeL3} from "./SubtreeImportExport/FSDataModel/FS_MapNode.js";
import {GetResourcesInImportSubtree, ImportResource, IR_NodeAndRevision} from "./SubtreeImportExport/FSImportHelpers.js";

@Observer
export class MI_ImportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
	//lastController: BoxController;
	render() {
		const {map, node, path, childGroup} = this.props;
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
						//containerStyle: {pointerEvents: "auto", backgroundColor: "rgba(255,255,255,1) !important"}, // commented; this way doesn't work
						containerStyle: {pointerEvents: "auto"}, // also make fully opaque; this dialog has complex content, so we need max readability

						message: ()=>{
							// style block is a hack-fix for to make this dialog fully opaque (its content is complex, so we need max readability)
							return <>
								<style>{`
									.ReactModal__Content:not(.neverMatch) { background-color: rgba(255,255,255,1) !important; }
								`}</style>
								<ImportSubtreeUI ref={c=>ui = c} {...sharedProps} {...{controller}}/>
							</>;
						},
					});
					//this.lastController = controller;
				}}/>
				{uiState.selectedImportResource instanceof IR_NodeAndRevision &&
				<VMenuItem text="Recreate import-node here" style={liveSkin.Style_VMenuItem()} onClick={async e=>{
					if (e.button != 0) return;
					const res = uiState.selectedImportResource as IR_NodeAndRevision;
					/*if (res.node.type == MapNodeType.argument) {
						const command = new AddArgumentAndClaim({
							mapID: map?.id,
							argumentParentID: node.id, argumentNode: res.node, argumentRevision: res.revision, argumentLink: res.link,
							claimNode: this.subNode!, claimRevision: this.subNode_revision!, claimLink: this.subNode_link,
						});
						command.RunOnServer();
					} else {*/
					res.link.group = childGroup;
					const command = new AddChildNode({
						mapID: map?.id, parentID: node.id, node: res.node, revision: res.revision, link: res.link,
					});
					command.RunOnServer();
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
		const uiState = store.main.maps.importSubtreeDialog;

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
										7) Open the downloaded file, select all of its text, copy it, and paste it into the "Subtree JSON" text-box below. (atm, you then need to [add a space, then click outside the box] a couple times, to workaround a bug)
										8) Proceed with the import process. (check "Start extracting resources", select nodes, then right-click locations in map and press "Recreate import-node here")
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
								<CheckBox ml={5} text="Auto-search by title" value={uiState.autoSearchByTitle} onChange={val=>RunInAction_Set(this, ()=>uiState.autoSearchByTitle = val)}/>
							</Row>
							<ScrollView>
								{resources.map((resource, index)=>{
									return <ImportResourceUI key={index} {...{resource, index, autoSearchByTitle: uiState.autoSearchByTitle}}/>;
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
class ImportResourceUI extends BaseComponent<{resource: ImportResource, index: number, autoSearchByTitle: boolean}, {search: boolean, existingNodesWithTitle: number|n}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.autoSearchByTitle != this.props.autoSearchByTitle) {
			this.SetState({search: props.autoSearchByTitle}, ()=>{
				this.ApplySearchSetting();
			});
		}
	}
	async ApplySearchSetting() {
		const res = this.props.resource;
		if (this.state.search && res instanceof IR_NodeAndRevision && res.CanSearchByTitle()) {
			const result = await apolloClient.query({
				query: gql`
					query SearchQueryForImport($title: String!) {
						nodeRevisions(filter: {phrasing: {contains: {text_base: $title}}}) {
							nodes { id }
						}
					}
				`,
				variables: {title: res.revision.phrasing.text_base},
			});
			const foundNodeIDs = result.data.nodeRevisions.nodes.map(a=>a.id);
			this.SetState({existingNodesWithTitle: foundNodeIDs.length});
		} else {
			this.SetState({existingNodesWithTitle: null});
		}
	}

	render() {
		const {resource: res, index} = this.props;
		const {search, existingNodesWithTitle} = this.state;
		const uiState = store.main.maps.importSubtreeDialog;
		const pathStr = res.path.join("."); //+ (resource.path.length > 0 ? "." : "");

		return (
			<Row mt={index == 0 ? 0 : 5} sel style={{border: "solid gray", borderWidth: index == 0 ? 0 : "1px 0 0 0"}}>
				{res instanceof IR_NodeAndRevision &&
				<>
					<Text style={{flexShrink: 0, fontWeight: "bold", padding: "0 3px", background: "rgba(128,128,128,.5)", marginBottom: -5}}>{pathStr}</Text>
					<Text ml={5} mr={5} style={{flex: 1, display: "block"}}>
						<Text mr={3} style={{display: "inline-block", flexShrink: 0, fontWeight: "bold"}}>
							{ModifyString(res.node.type, m=>[m.startLower_to_upper])}
							{res.node.type == MapNodeType.argument && res.link.polarity != null &&
								<Text style={{display: "inline-block", flexShrink: 0, fontWeight: "bold"}}> [{res.link.polarity == Polarity.supporting ? "pro" : "con"}]</Text>}
							{":"}
						</Text>
						{res.revision.phrasing.text_base}
					</Text>
					{res.CanSearchByTitle() &&
					<CheckBox ml={5} text={`Search: ${existingNodesWithTitle ?? "?"}`}
						style={ES(
							{marginBottom: -5},
							existingNodesWithTitle == 0 && {background: "rgba(0,255,0,.5)"},
							existingNodesWithTitle != null && existingNodesWithTitle > 0 && {background: "rgba(255,0,0,.5)"},
						)}
						value={search} onChange={async val=>{
							this.SetState({search: val}, ()=>{
								this.ApplySearchSetting();
							});
						}}/>}
				</>}
				<CheckBox ml={5} text="Selected" style={{flexShrink: 0}} value={uiState.selectedImportResource == res} onChange={val=>{
					const newResource = val ? res : null;
					RunInAction_Set(this, ()=>uiState.selectedImportResource = newResource);
				}}/>
			</Row>
		);
	}
}
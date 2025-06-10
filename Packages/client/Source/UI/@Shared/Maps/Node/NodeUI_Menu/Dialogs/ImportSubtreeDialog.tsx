import {parseString, RowMap} from "@fast-csv/parse";
import {AsNodeL1Input, GetSystemAccessPolicyID, systemPolicy_publicUngoverned_name} from "dm_common";
import {E, FromJSON, GetEntries, SleepAsync, Timer} from "js-vextensions";
import {GetAsync} from "mobx-graphlink";
import React, {useMemo, useState} from "react";
import ReactList from "react-list";
import {Button, CheckBox, Column, Row, Select, Spinner, Text, TextArea} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {store} from "Store";
import {GetOpenMapID} from "Store/main.js";
import {MAX_TIMEOUT_DURATION} from "ui-debug-kit";
import {CSV_SL_Row} from "Utils/DataFormats/CSV/CSV_SL/DataModel.js";
import {GetResourcesInImportSubtree_CSV_SL} from "Utils/DataFormats/CSV/CSV_SL/ImportHelpers.js";
import {DataExchangeFormat, DataExchangeFormat_entries_supportedBySubtreeImporter, ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat.js";
import {GetResourcesInImportSubtree_CG} from "Utils/DataFormats/JSON/ClaimGen/ImportHelpers.js";
import {FS_NodeL3} from "Utils/DataFormats/JSON/DM_Old/FSDataModel/FS_Node.js";
import {GetResourcesInImportSubtree as GetResourcesInImportSubtree_JsonDmFs} from "Utils/DataFormats/JSON/DM_Old/FSImportHelpers.js";
import {RunCommand_AddChildNode} from "Utils/DB/Command.js";
import {CommandEntry, RunCommandBatch} from "Utils/DB/RunCommandBatch.js";
import {AddNotificationMessage, InfoButton, Observer, RunInAction_Set, UseWindowEventListener} from "web-vcore";
import {CG_Node} from "../../../../../../Utils/DataFormats/JSON/ClaimGen/DataModel.js";
import {GetResourcesInImportSubtree_JsonDm} from "../../../../../../Utils/DataFormats/JSON/DM/DMImportHelpers.js";
import {DMSubtreeData} from "../../../../../../Utils/DataFormats/JSON/DM/DMSubtreeData.js";
import {PolicyPicker, PolicyPicker_Button} from "../../../../../Database/Policies/PolicyPicker.js";
import {MI_SharedProps} from "../../NodeUI_Menu.js";
import {CreateResource, ImportResourcesOnServer, ResolveNodeIDsForInsertPath} from "./ImportSubtree/Utils.js";
import {ImportResourceUI} from "./ImportSubtree/ImportResourceUI.js";

enum ImportSubtreeUI_LeftTab {
	source = "source",
	options = "options",
}
enum ImportSubtreeUI_RightTab {
	resources = "resources",
}

//type ExtractProps<T> = T extends React.Component<infer TProps, any> ? TProps : T;
type ExtractState<T> = T extends React.Component<any, infer TState> ? TState : T;

@Observer
export class ImportSubtreeUI extends BaseComponent<
	{controller: BoxController} & MI_SharedProps,
	{
		leftTab: ImportSubtreeUI_LeftTab,
		rightTab: ImportSubtreeUI_RightTab,

		// left panel
		sourceText: string,
		sourceText_parseError: string|n,
		forJSONDM_subtreeData: DMSubtreeData|n,
		forJSONDMFS_subtreeData: FS_NodeL3|n,
		forJSONCG_subtreeData: CG_Node|n,
		forCSVSL_subtreeData: CSV_SL_Row[]|n,

		// right-panel
		showLeftPanel: boolean,
		process: boolean,
		importSelected: boolean, selectedIRs_nodeAndRev_atImportStart: number,
		serverImportInProgress: boolean, serverImport_commandsCompleted: number,
		selectFromIndex: number,
		searchQueryGen: number,
	},
	{resources: ImportResource[], resources_parseError: Error|n}
> {
	static initialState: Partial<ExtractState<ImportSubtreeUI>> = {
		leftTab: ImportSubtreeUI_LeftTab.source,
		rightTab: ImportSubtreeUI_RightTab.resources,
		sourceText: "", showLeftPanel: true,
		process: false,
		importSelected: false, selectedIRs_nodeAndRev_atImportStart: 0,
		serverImportInProgress: false, serverImport_commandsCompleted: 0,
		searchQueryGen: 0,
	};

	render() {
		const {mapID, map, node, path, controller} = this.props;
		const {
			sourceText, sourceText_parseError, forJSONDM_subtreeData, forJSONDMFS_subtreeData, forJSONCG_subtreeData, forCSVSL_subtreeData, process,
			importSelected, selectedIRs_nodeAndRev_atImportStart,
			serverImportInProgress, serverImport_commandsCompleted,
			leftTab, rightTab, showLeftPanel,
		} = this.state;
		const uiState = store.main.maps.importSubtreeDialog;
		if (map == null) return null;

		// todo: have this be used by the json-dm and csv-sl importer functions as well
		const nodeAccessPolicyID = map.nodeAccessPolicy ?? GetSystemAccessPolicyID(systemPolicy_publicUngoverned_name);
		const importContext = useMemo(()=>({mapID: map.id, nodeAccessPolicyID, importUnderNode: node}), [map.id, nodeAccessPolicyID, node]);

		let resources: ImportResource[] = [];
		let resources_parseError: Error|n;
		if (process) {
			try {
				if (uiState.sourceType == DataExchangeFormat.json_dm && forJSONDM_subtreeData != null) {
					resources = GetResourcesInImportSubtree_JsonDm(forJSONDM_subtreeData, node);
				} else if (uiState.sourceType == DataExchangeFormat.json_dm_fs && forJSONDMFS_subtreeData != null) {
					resources = GetResourcesInImportSubtree_JsonDmFs(forJSONDMFS_subtreeData);
				} else if (uiState.sourceType == DataExchangeFormat.json_cg && forJSONCG_subtreeData != null) {
					resources = GetResourcesInImportSubtree_CG(importContext, forJSONCG_subtreeData);
				} else if (uiState.sourceType == DataExchangeFormat.csv_sl && forCSVSL_subtreeData != null) {
					resources = GetResourcesInImportSubtree_CSV_SL(forCSVSL_subtreeData);
				}
				if (uiState.accessPolicyOverride != null) {
					for (const resource of resources) {
						if (resource instanceof IR_NodeAndRevision) {
							resource.node.accessPolicy = uiState.accessPolicyOverride;
						}
					}
				}
			} catch (ex) {
				resources_parseError = ex as Error;
				console.error("Error while processing import-subtree data:", ex);
			}
		}
		this.Stash({resources, resources_parseError});

		const selectedIRs_nodeAndRev = [...uiState.selectedImportResources].filter(a=>a instanceof IR_NodeAndRevision) as IR_NodeAndRevision[];
		const selectedIRs_nodeAndRev_importedSoFar = selectedIRs_nodeAndRev_atImportStart - selectedIRs_nodeAndRev.length;
		const importProgressStr = this.nodeCreationTimer.Enabled
			? `${selectedIRs_nodeAndRev_importedSoFar}/${selectedIRs_nodeAndRev_atImportStart}`
			: "local";

		const [bodyHeight, setBodyHeight] = useState(document.body.clientHeight);
		UseWindowEventListener("resize", ()=>setBodyHeight(document.body.clientHeight));

		return (
			<Column style={{
				width: showLeftPanel ? 1300 : 800,
				//height: 700,
				height: bodyHeight - 100,
			}}>
				<Row style={{flex: 1, minHeight: 0}}>
					{showLeftPanel &&
					<Column style={{width: 500}}>
						<Row>
							<Select displayType="button bar" options={GetEntries(ImportSubtreeUI_LeftTab, "ui")} value={leftTab} onChange={val=>this.SetState({leftTab: val})}/>
							<Text ml={5}>Source type:</Text>
							<Select ml={5} options={DataExchangeFormat_entries_supportedBySubtreeImporter} value={uiState.sourceType} onChange={val=>RunInAction_Set(this, ()=>uiState.sourceType = val)}/>
						</Row>
						{leftTab == ImportSubtreeUI_LeftTab.source &&
						<>
							<Row>
								{uiState.sourceType == DataExchangeFormat.json_dm &&
								<Row center style={{flex: 1}}>
									<Text>Subtree JSON:</Text>
									<InfoButton ml={5} text={`
										Obtain this subtree-json by:
										1) Right-click the node you want to export, and press "Advanced -> Export subtree".
										2) Choose your export options (probably enable all fields of nodes, nodeRevisions, and nodeLinks), then save to file.
										3) Open the file, copy all text, and paste it into this subtree-json text area.
										Note: Currently this can only import the nodes, nodeRevisions, and nodeLinks data.
									`.AsMultiline(0)}/>
								</Row>}
								{uiState.sourceType == DataExchangeFormat.json_dm_fs &&
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
								</Row>}
								{/*uiState.sourceType == DataExchangeFormat.json_cg &&
								<Row center style={{flex: 1}}>
									<Text>Subtree JSON:</Text>
									<InfoButton ml={5} text={`
										Obtain this subtree-json from the claimgen tool. (todo: add exact instructions on the export steps)
									`.AsMultiline(0)}/>
								</Row>*/}
								{uiState.sourceType == DataExchangeFormat.csv_sl &&
								<Row center style={{flex: 1}}>
									<Text>Spreadsheet CSV:</Text>
									<InfoButton ml={5} text={`Obtain this subtree-json by running File->Download->CSV in a Google Spreadsheet in the csv-sl format.`}/>
								</Row>}
								<Row center style={{flex: 1}}>
									<Text>Validity:</Text>
									{sourceText_parseError == null &&
									<Text ml={5}>valid</Text>}
									{sourceText_parseError != null &&
									<>
										<Text ml={5}>invalid</Text>
										<InfoButton ml={5} sel text={sourceText_parseError.toString()}/>
									</>}
								</Row>
							</Row>
							<TextArea value={sourceText}
								style={{
									flex: 1, whiteSpace: "pre", // disabling word-wrap is important for performance, for large imports
								}}
								onChange={newSourceText=>{
									const newState = {sourceText: newSourceText} as ExtractState<ImportSubtreeUI>;

									if (uiState.sourceType == DataExchangeFormat.json_dm) {
										let subtreeData_new: DMSubtreeData|n = null;
										try {
											subtreeData_new = FromJSON(newSourceText) as DMSubtreeData;
											newState.forJSONDM_subtreeData = subtreeData_new;
											newState.sourceText_parseError = null;
										} catch (err) {
											newState.forJSONDM_subtreeData = null;
											newState.sourceText_parseError = err;
										}
										this.SetState(newState);
									} else if (uiState.sourceType == DataExchangeFormat.json_dm_fs) {
										let subtreeData_new: FS_NodeL3|n = null;
										try {
											subtreeData_new = FromJSON(newSourceText) as FS_NodeL3;
											newState.forJSONDMFS_subtreeData = subtreeData_new;
											newState.sourceText_parseError = null;
										} catch (err) {
											newState.forJSONDMFS_subtreeData = null;
											newState.sourceText_parseError = err;
										}
										this.SetState(newState);
									} else if (uiState.sourceType == DataExchangeFormat.json_cg) {
										let subtreeData_new: CG_Node|n = null;
										try {
											subtreeData_new = FromJSON(newSourceText);
											newState.forJSONCG_subtreeData = subtreeData_new;
											newState.sourceText_parseError = null;
										} catch (err) {
											newState.forJSONCG_subtreeData = null;
											newState.sourceText_parseError = err;
										}
										this.SetState(newState);
									} else if (uiState.sourceType == DataExchangeFormat.csv_sl) {
										const collectedRows = [] as RowMap<any>[];
										parseString(newSourceText, {headers: true})
											.on("data", (row: RowMap<any>)=>{
												collectedRows.push(row);
											})
											.on("error", err=>{
												newState.forCSVSL_subtreeData = null;
												newState.sourceText_parseError = `${err}`;
												this.SetState(newState);
											})
											.on("end", (rowCount: number)=>{
												const subtreeData_new = collectedRows.map(row=>CSV_SL_Row.FromRawRow(row));
												newState.forCSVSL_subtreeData = subtreeData_new;
												newState.sourceText_parseError = null;
												this.SetState(newState);
											});
									}
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
					<Column style={{width: 800, padding: "0 5px"}}>
						<Row>
							{/*<Select displayType="button bar" options={GetEntries(ImportSubtreeUI_RightTab, "ui")} value={rightTab} onChange={val=>this.SetState({rightTab: val})}/>*/}
							<CheckBox /*ml={5}*/ text="Show left panel" value={showLeftPanel} onChange={val=>this.SetState({showLeftPanel: val})}/>
							<Row ml="auto">
								<CheckBox text={[`Extract resources`, resources.length > 0 && `(${resources.length})`].filter(a=>a).join(" ")} value={process} onChange={val=>this.SetState({process: val})}/>
								<CheckBox ml={5} text={`Import selected (${importProgressStr})`} enabled={!serverImportInProgress} value={this.nodeCreationTimer.Enabled} onChange={val=>{
									this.SetTimerEnabled(val);
									this.SetState({selectedIRs_nodeAndRev_atImportStart: selectedIRs_nodeAndRev.length});
								}}/>
								<Button ml={5}
									text={[
										`Import ALL (server)`,
										serverImportInProgress && ` [${this.state.serverImport_commandsCompleted}/${resources.length}]`,
									].filter(a=>a).join("")}
									enabled={
										// atm only the resource-extraction code for the json-dm and json-cg formats adds the "insertPath_parentResourceLocalID" field needed for server-side tree-importing
										resources.length > 0 && uiState.sourceType.IsOneOf(DataExchangeFormat.json_dm, DataExchangeFormat.json_cg) &&
										!this.nodeCreationTimer.Enabled && !serverImportInProgress
									}
									onClick={async()=>{
										ShowMessageBox({
											title: `Start import of all ${resources.length} resources?`, cancelButton: true,
											message: `
												This will start an import of all ${resources.length} resources (not just the ${selectedIRs_nodeAndRev.length} selected ones), run as a command-batch on the server.

												If the import is large, this could take a long time. You can view the progress in the text of the "Import ALL (server) [X/X]" button.
												
												Note also: If you want to cancel the import, refresh the page while it's still running. (this will cancel the graphql subscription, causing the server to drop the operation)
											`.AsMultiline(0),
											onOK: async()=>{
												this.SetState({serverImportInProgress: true, serverImport_commandsCompleted: 0});
												try {
													const result = await ImportResourcesOnServer(resources, map.id, node.id, resourcesImported=>{
														this.SetState({serverImport_commandsCompleted: resourcesImported});
													});
													ShowMessageBox({
														title: "Import succeeded",
														message: `Import has completed. Commands in batch completed: ${result.results.length ?? 0}`,
													});
												} catch (ex) {
													ShowMessageBox({
														title: `Import failed`,
														message: `Import has failed (no changes *should* have been persisted). Error details: ${ex}`,
													});
												}
												this.SetState({serverImportInProgress: false, serverImport_commandsCompleted: 0});
											},
										});
									}}/>
							</Row>
						</Row>
						{rightTab == ImportSubtreeUI_RightTab.resources &&
						<>
							<Row>
								<CheckBox text="Auto-search by title" value={uiState.autoSearchByTitle} onChange={val=>RunInAction_Set(this, ()=>uiState.autoSearchByTitle = val)}/>
								<CheckBox ml={5} text="Show auto-insert tools" value={uiState.showAutoInsertTools} onChange={val=>RunInAction_Set(this, ()=>uiState.showAutoInsertTools = val)}/>
								{uiState.showAutoInsertTools &&
								<>
									<Text ml={10}>Interval:</Text>
									<Spinner ml={5} value={uiState.autoInsert_interval} onChange={val=>RunInAction_Set(this, ()=>uiState.autoInsert_interval = val)}/>
									<Text ml={3}>ms</Text>
									{/*<Text ml={5}>Batch:</Text>
									<Spinner ml={5} value={uiState.autoInsert_batchSize} onChange={val=>RunInAction_Set(this, ()=>uiState.autoInsert_batchSize = val)}/>*/}
								</>}
								<Text ml={10}>Policy override:</Text>
								<PolicyPicker allowClear={true} textForNull="(use original policy id)" value={uiState.accessPolicyOverride} onChange={val=>RunInAction_Set(this, ()=>uiState.accessPolicyOverride = val)}>
									<PolicyPicker_Button ml={5} policyID={uiState.accessPolicyOverride} idTrimLength={3} enabled={!serverImportInProgress} style={{padding: "3px 10px"}}/>
								</PolicyPicker>
							</Row>
							<ScrollView>
								{resources_parseError != null &&
								<Text mt={5} sel style={{color: "red", whiteSpace: "pre-wrap"}}>Error while processing import-subtree data: {resources_parseError.stack ?? resources_parseError.toString()}</Text>}
								<ReactList type="variable" length={resources.length}
									itemRenderer={this.RenderResource}
									itemSizeEstimator={this.EstimateResourceUIHeight}/>
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

	SetTimerEnabled(enabled: boolean) {
		const uiState = store.main.maps.importSubtreeDialog;
		this.nodeCreationTimer.Enabled = enabled;
		if (enabled) {
			setTimeout(()=>this.nodeCreationTimer.func(), uiState.autoInsert_interval); // run first iteration soon (1s by default)
		}
		this.forceUpdate();
	}
	nodeCreationTimer = new Timer(MAX_TIMEOUT_DURATION, async()=>{
		if (!this.nodeCreationTimer.Enabled) return;
		try {
			console.log(`Starting next iteration of node-creation-timer. (${this.nodeCreationTimer.callCount_total})`);
			const {map, node: rootNodeForImport} = this.props;
			const uiState = store.main.maps.importSubtreeDialog;
			const selectedIRs_nodeAndRev = [...uiState.selectedImportResources].filter(a=>a instanceof IR_NodeAndRevision) as IR_NodeAndRevision[];
			if (selectedIRs_nodeAndRev.length == 0) {
				console.log(`Import process completed; stopping timer.`);
				this.SetTimerEnabled(false);
				return;
			}

			const res = selectedIRs_nodeAndRev[0];
			const insertPath = res instanceof IR_NodeAndRevision && res.insertPath_titles ? res.insertPath_titles : [];
			const insertPath_resolvedNodeIDs = await GetAsync(()=>ResolveNodeIDsForInsertPath(rootNodeForImport.id, insertPath));

			// if a node in the insert-path doesn't exist, create it now (as this timer-tick's action)
			const insertPath_indexOfFirstMissingNode = insertPath_resolvedNodeIDs.findIndex(a=>a == null);
			if (insertPath_indexOfFirstMissingNode != -1) {
				const newNodeText = insertPath[insertPath_indexOfFirstMissingNode];

				// commented; hit what seems to be a race-condition with this (presumably GetAsync above "missed" a node that had just been added, on the previous timer-tick)
				// It's not really needed anyway (user can just select-for-insert or manually-add the rows for the ancestor nodes as well), so will just leave it out for now (to prevent duplicate ancestor-adding).
				/*const parentNodeID = insertPath_indexOfFirstMissingNode == 0 ? rootNodeForImport.id : insertPath_resolvedNodeIDs[insertPath_indexOfFirstMissingNode - 1]!;
				const success = await CreateAncestorForResource(res, map?.id, parentNodeID, newNodeText, res.node.accessPolicy);
				if (!success) {
					AddNotificationMessage(`Could not create ancestor "${newNodeText}".`);
					this.SetTimerEnabled(false);
					return;
				}*/
				// try again after 3s; if node still missing, give up (safer alternative to auto-insert of ancestor)
				await SleepAsync(3000);
				const insertPath_resolvedNodeIDs_retry = await GetAsync(()=>ResolveNodeIDsForInsertPath(rootNodeForImport.id, insertPath));
				const insertPath_indexOfFirstMissingNode_retry = insertPath_resolvedNodeIDs_retry.findIndex(a=>a == null);
				if (insertPath_indexOfFirstMissingNode_retry != -1) {
					AddNotificationMessage(`Auto-import canceled since required ancestor was missing. Ancestor title: ${newNodeText}`);
					this.SetTimerEnabled(false);
					return;
				}

				//await commandForAncestor.RunOnServer();
				this.TriggerSearchesToRerun();
				setTimeout(()=>this.nodeCreationTimer.func(), uiState.autoInsert_interval); // run next iteration soon (1s by default)
				return;
			}

			// if insert path is resolved, then create the selected-resource's node itself
			await CreateResource(res, map?.id, insertPath_resolvedNodeIDs.LastOrX() ?? rootNodeForImport.id);
			RunInAction_Set("MI_ImportSubtree.nodeCreationTimer.tickCompletion", ()=>{
				uiState.selectedImportResources.delete(res);
			});
			this.TriggerSearchesToRerun();
			setTimeout(()=>this.nodeCreationTimer.func(), uiState.autoInsert_interval); // run next iteration soon (1s by default)
			return;
		} catch (err) {
			AddNotificationMessage(`Got error in node-creation-timer for resource-importing; stopping timer. @error:${err}`);
			this.SetTimerEnabled(false);
		}
	});
	TriggerSearchesToRerun = ()=>{
		this.SetState({searchQueryGen: this.state.searchQueryGen + 1});
	};

	EstimateResourceUIHeight = (index: number, cache: any)=>{
		return 50;
	};
	RenderResource = (index: number, key: any)=>{
		const {node} = this.props;
		const {searchQueryGen} = this.state;
		const {resources} = this.stash;
		const resource = resources[index];
		const uiState = store.main.maps.importSubtreeDialog;

		let autoSearchByTitle = uiState.autoSearchByTitle;
		// temp-disabled, till backend supports the search feature
		autoSearchByTitle = false;

		return (
			<ImportResourceUI key={index} importUnderNode={node} searchQueryGen={searchQueryGen}
				onNodeCreated={this.TriggerSearchesToRerun}
				{...{resource, index, resources, autoSearchByTitle}}/>
		);
	};
}
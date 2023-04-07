import {AddChildNode, ChildGroup, CullNodePhrasingToBeEmbedded, GetMap, GetNode, GetNodeChildrenL2, GetNodeDisplayText, GetNodeL2, HasAdminPermissions, NodeL1, NodeL3, NodePhrasing, NodeRevision, NodeType, MeID, NodeLink, Polarity, SourceType, systemUserID, AsNodeL1Input} from "dm_common";
import React, {ComponentProps} from "react";
import {store} from "Store";
import {CSV_SL_Row} from "Utils/DataFormats/CSV/CSV_SL/DataModel.js";
import {GetResourcesInImportSubtree_CSV_SL} from "Utils/DataFormats/CSV/CSV_SL/ImportHelpers.js";
import {DataExchangeFormat, ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat.js";
import {FS_NodeL3} from "Utils/DataFormats/JSON/DM_Old/FSDataModel/FS_Node.js";
import {GetResourcesInImportSubtree} from "Utils/DataFormats/JSON/DM_Old/FSImportHelpers.js";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {AddNotificationMessage, ES, InfoButton, O, Observer, RunInAction_Set} from "web-vcore";
import {gql} from "web-vcore/nm/@apollo/client";
import {E, FromJSON, GetEntries, ModifyString, Timer} from "web-vcore/nm/js-vextensions.js";
import {makeObservable} from "web-vcore/nm/mobx";
import {ignore} from "web-vcore/nm/mobx-sync";
import {Button, CheckBox, Column, Row, Select, Spinner, Text, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {parseString, RowMap} from "@fast-csv/parse";
import ReactList from "react-list";
import {GetOpenMapID} from "Store/main.js";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";
import {Command, CreateAccessor, GetAsync} from "mobx-graphlink";
import {MAX_TIMEOUT_DURATION} from "ui-debug-kit";
import {RunCommand_AddChildNode} from "Utils/DB/Command.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_ImportSubtree extends BaseComponent<MI_SharedProps, {}, ImportResource> {
	//lastController: BoxController;
	render() {
		const {map, node, path, childGroup} = this.props;
		const sharedProps = this.props as MI_SharedProps;
		if (!HasAdminPermissions(MeID())) return null;

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
								<ImportSubtreeUI ref={c=>ui = c} {...sharedProps} {...{controller}}/>
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
					res.link.group = childGroup;
					await RunCommand_AddChildNode({mapID: map?.id, parentID: node.id, node: AsNodeL1Input(res.node), revision: res.revision, link: res.link});
				}}/>}
			</>
		);
	}
}

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
class ImportSubtreeUI extends BaseComponent<
	{controller: BoxController} & MI_SharedProps,
	{
		leftTab: ImportSubtreeUI_LeftTab,
		rightTab: ImportSubtreeUI_RightTab,

		// left panel
		sourceText: string,
		sourceText_parseError: string|n,
		forJSONDM_subtreeData: FS_NodeL3|n,
		forCSVSL_subtreeData: CSV_SL_Row[]|n,

		// right-panel
		showLeftPanel: boolean,
		process: boolean,
		importSelected: boolean, selectedIRs_nodeAndRev_atImportStart: number,
		selectFromIndex: number,
		searchQueryGen: number,
	},
	{resources: ImportResource[]}
> {
	static initialState: Partial<ExtractState<ImportSubtreeUI>> = {
		leftTab: ImportSubtreeUI_LeftTab.source,
		rightTab: ImportSubtreeUI_RightTab.resources,
		sourceText: "", showLeftPanel: true,
		process: false,
		importSelected: false, selectedIRs_nodeAndRev_atImportStart: 0,
		searchQueryGen: 0,
	};

	render() {
		const {mapID, node, path, controller} = this.props;
		const {sourceText, sourceText_parseError, forJSONDM_subtreeData, forCSVSL_subtreeData, process, importSelected, selectedIRs_nodeAndRev_atImportStart, leftTab, rightTab, showLeftPanel} = this.state;
		const uiState = store.main.maps.importSubtreeDialog;

		let resources: ImportResource[] = [];
		if (process) {
			if (uiState.sourceType == DataExchangeFormat.json_dm && forJSONDM_subtreeData != null) {
				resources = GetResourcesInImportSubtree(forJSONDM_subtreeData);
			} else if (uiState.sourceType == DataExchangeFormat.csv_sl && forCSVSL_subtreeData != null) {
				resources = GetResourcesInImportSubtree_CSV_SL(forCSVSL_subtreeData);
			}
		}
		this.Stash({resources});

		const selectedIRs_nodeAndRev = [...uiState.selectedImportResources].filter(a=>a instanceof IR_NodeAndRevision) as IR_NodeAndRevision[];
		const selectedIRs_nodeAndRev_importedSoFar = selectedIRs_nodeAndRev_atImportStart - selectedIRs_nodeAndRev.length;
		const importProgressStr = this.nodeCreationTimer.Enabled
			? `${selectedIRs_nodeAndRev_importedSoFar}/${selectedIRs_nodeAndRev_atImportStart}`
			: "start";

		return (
			<Column style={{
				width: showLeftPanel ? 1300 : 800,
				//height: 700,
				height: document.body.clientHeight - 100,
			}}>
				<Row style={{flex: 1, minHeight: 0}}>
					{showLeftPanel &&
					<Column style={{width: 500}}>
						<Row>
							<Select displayType="button bar" options={GetEntries(ImportSubtreeUI_LeftTab, "ui")} value={leftTab} onChange={val=>this.SetState({leftTab: val})}/>
							<Text ml={5}>Source type:</Text>
							<Select ml={5}
								options={GetEntries(DataExchangeFormat, val=>{
									if (val == DataExchangeFormat.json_dm) return "JSON (DM)";
									if (val == DataExchangeFormat.csv_sl) return "CSV (SL)";
									return val;
								})}
								value={uiState.sourceType}
								onChange={val=>RunInAction_Set(this, ()=>uiState.sourceType = val)}/>
						</Row>
						{leftTab == ImportSubtreeUI_LeftTab.source &&
						<>
							<Row>
								{uiState.sourceType == DataExchangeFormat.json_dm &&
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
							<TextArea value={sourceText} style={{flex: 1}} onChange={newSourceText=>{
								this.SetState({sourceText: newSourceText});

								const sourceText = this.state.sourceText;
								if (uiState.sourceType == DataExchangeFormat.json_dm) {
									let subtreeData_new: FS_NodeL3|n = null;
									try {
										subtreeData_new = FromJSON(sourceText) as FS_NodeL3;
										this.SetState({
											forJSONDM_subtreeData: subtreeData_new,
											sourceText_parseError: null,
										});
									} catch (err) {
										this.SetState({
											forJSONDM_subtreeData: null,
											sourceText_parseError: err,
										});
									}
								} else if (uiState.sourceType == DataExchangeFormat.csv_sl) {
									const collectedRows = [] as RowMap<any>[];
									parseString(sourceText, {headers: true})
										.on("data", (row: RowMap<any>)=>{
											collectedRows.push(row);
										})
										.on("error", err=>{
											this.SetState({
												forCSVSL_subtreeData: null,
												sourceText_parseError: `${err}`,
											});
										})
										.on("end", (rowCount: number)=>{
											const subtreeData_new = collectedRows.map(row=>CSV_SL_Row.FromRawRow(row));
											this.SetState({
												forCSVSL_subtreeData: subtreeData_new,
												sourceText_parseError: null,
											});
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
							<Select displayType="button bar" options={GetEntries(ImportSubtreeUI_RightTab, "ui")} value={rightTab} onChange={val=>this.SetState({rightTab: val})}/>
							<CheckBox ml={5} text="Show left panel" value={showLeftPanel} onChange={val=>this.SetState({showLeftPanel: val})}/>
							<Row ml="auto">
								<CheckBox text="Extract resources" value={process} onChange={val=>this.SetState({process: val})}/>
								<CheckBox ml={5} text={`Import selected (${importProgressStr})`} value={this.nodeCreationTimer.Enabled} onChange={val=>{
									this.SetTimerEnabled(val);
									this.SetState({selectedIRs_nodeAndRev_atImportStart: selectedIRs_nodeAndRev.length});
								}}/>
							</Row>
						</Row>
						{rightTab == ImportSubtreeUI_RightTab.resources &&
						<>
							<Row>
								<CheckBox text="Auto-search by title" value={uiState.autoSearchByTitle} onChange={val=>RunInAction_Set(this, ()=>uiState.autoSearchByTitle = val)}/>
								<CheckBox ml={5} text="Show auto-insert tools" value={uiState.showAutoInsertTools} onChange={val=>RunInAction_Set(this, ()=>uiState.showAutoInsertTools = val)}/>
								{/*uiState.showAutoInsertTools &&
								<>
									<Text ml={5}>Batch:</Text>
									<Spinner ml={5} value={uiState.autoInsert_batchSize} onChange={val=>RunInAction_Set(this, ()=>uiState.autoInsert_batchSize = val)}/>
								</>*/}
							</Row>
							<ScrollView>
								{/*resources.map((resource, index)=>{
									return <ImportResourceUI key={index} {...{resource, index, autoSearchByTitle: uiState.autoSearchByTitle}}/>;
								})*/}
								<ReactList type="variable" length={resources.length}
									//pageSize={20} threshold={300}
									/*itemsRenderer={(items, ref) => {
										return <div ref={ref}>
											<Column style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, background: HSLA(0, 0, 0, 1) }}>
											</Column>
											{items}
										</div>;
									}}*/
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
		this.nodeCreationTimer.Enabled = enabled;
		if (enabled) {
			setTimeout(()=>this.nodeCreationTimer.func(), 1000); // run first iteration in 1s
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
			const insertPath = res instanceof IR_NodeAndRevision && res.insertPath ? res.insertPath : [];
			const insertPath_resolvedNodeIDs = await GetAsync(()=>ResolveNodeIDsForInsertPath(rootNodeForImport.id, insertPath));

			// if a node in the insert-path doesn't exist, create it now (as this timer-tick's action)
			const insertPath_indexOfFirstMissingNode = insertPath_resolvedNodeIDs.findIndex(a=>a == null);
			if (insertPath_indexOfFirstMissingNode != -1) {
				const parentNodeID = insertPath_indexOfFirstMissingNode == 0 ? rootNodeForImport.id : insertPath_resolvedNodeIDs[insertPath_indexOfFirstMissingNode - 1]!;
				const newNodeText = insertPath[insertPath_indexOfFirstMissingNode];
				const success = await CreateAncestorForResource(res, map?.id, parentNodeID, newNodeText, res.node.accessPolicy);
				if (!success) {
					AddNotificationMessage(`Could not create ancestor "${newNodeText}".`);
					this.SetTimerEnabled(false);
					return;
				}

				//await commandForAncestor.RunOnServer();
				this.TriggerSearchesToRerun();
				setTimeout(()=>this.nodeCreationTimer.func(), 1000); // run next iteration in 1s
				return;
			}

			// if insert path is resolved, then create the selected-resource's node itself
			await CreateResource(res, map?.id, insertPath_resolvedNodeIDs.LastOrX() ?? rootNodeForImport.id);
			RunInAction_Set("MI_ImportSubtree.nodeCreationTimer.tickCompletion", ()=>{
				uiState.selectedImportResources.delete(res);
			});
			this.TriggerSearchesToRerun();
			setTimeout(()=>this.nodeCreationTimer.func(), 1000); // run next iteration in 1s
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
		return (
			<ImportResourceUI key={index} rootNodeForImport={node} searchQueryGen={searchQueryGen}
				onNodeCreated={this.TriggerSearchesToRerun}
				{...{resource, index, resources, autoSearchByTitle: uiState.autoSearchByTitle}}/>
		);
	};
}

@Observer
class ImportResourceUI extends BaseComponent<
	{
		rootNodeForImport: NodeL3, resource: ImportResource, index: number, resources: ImportResource[],
		autoSearchByTitle: boolean,
		searchQueryGen: number, onNodeCreated: ()=>any,
	},
	{search: boolean, existingNodesWithTitle: number|n}
> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.autoSearchByTitle != this.props.autoSearchByTitle) {
			this.SetState({search: props.autoSearchByTitle}, ()=>{
				this.ApplySearchSetting();
			});
		}
		// here, we only rerun the search (based on search-query-generation), if we haven't found a matching node yet
		else if (props.searchQueryGen != this.props.searchQueryGen && (this.state.existingNodesWithTitle ?? 0) == 0) {
			this.ApplySearchSetting();
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
				fetchPolicy: "network-only",
			});
			const foundNodeIDs = result.data.nodeRevisions.nodes.map(a=>a.id);
			this.SetState({existingNodesWithTitle: foundNodeIDs.length});
		} else {
			this.SetState({existingNodesWithTitle: null});
		}
	}

	render() {
		const {rootNodeForImport, resource: res, index, resources, onNodeCreated} = this.props;
		const {search, existingNodesWithTitle} = this.state;
		const uiState = store.main.maps.importSubtreeDialog;
		const pathStr = res.pathInData.join("."); //+ (resource.path.length > 0 ? "." : "");

		const map = GetMap(GetOpenMapID());

		const insertPath = res instanceof IR_NodeAndRevision && res.insertPath ? res.insertPath : [];
		const insertPath_resolvedNodeIDs = ResolveNodeIDsForInsertPath(rootNodeForImport.id, insertPath);

		return (
			<Column mt={index == 0 ? 0 : 5} pr={5} sel style={{border: "solid gray", borderWidth: index == 0 ? 0 : "1px 0 0 0"}}>
				<Row>
					{res instanceof IR_NodeAndRevision &&
					<>
						<Text style={{flexShrink: 0, fontWeight: "bold", padding: "0 3px", background: "rgba(128,128,128,.5)", marginBottom: -5}}>{pathStr}</Text>
						<Text ml={5} mr={5} style={{flex: 1, display: "block"}}>
							<Text mr={3} style={{display: "inline-block", flexShrink: 0, fontWeight: "bold"}}>
								{ModifyString(res.node.type, m=>[m.startLower_to_upper])}
								{res.node.type == NodeType.argument && res.link.polarity != null &&
									<Text style={{display: "inline-block", flexShrink: 0, fontWeight: "bold"}}> [{res.link.polarity == Polarity.supporting ? "pro" : "con"}]</Text>}
								{":"}
							</Text>
							{res.revision.phrasing.text_base}
						</Text>
					</>}
					<Column>
						{res instanceof IR_NodeAndRevision && res.CanSearchByTitle() &&
							<CheckBox ml={5} text={`Search: ${existingNodesWithTitle ?? "?"}`}
								style={ES(
									{flex: 1},
									existingNodesWithTitle == 0 && {background: "rgba(0,255,0,.5)"},
									existingNodesWithTitle != null && existingNodesWithTitle > 0 && {background: "rgba(255,0,0,.5)"},
								)}
								value={search} onChange={async val=>{
									this.SetState({search: val}, ()=>{
										this.ApplySearchSetting();
									});
								}}/>}
						<CheckBox ml={5} text="Selected"
							style={E(
								{flexShrink: 0},
								uiState.selectedImportResources.has(res) && {background: "rgba(255,0,255,.5)"},
							)}
							value={uiState.selectedImportResources.has(res)}
							onChange={(val, e)=>{
								RunInAction_Set(this, ()=>{
									const newSelected = val;
									let startI = index;
									let lastI = index;
									if (e.nativeEvent.shiftKey) {
										if (uiState.selectFromIndex != -1) {
											startI = Math.min(uiState.selectFromIndex, index);
											lastI = Math.max(uiState.selectFromIndex, index);
										}
									} else {
										uiState.selectFromIndex = index;
									}

									for (let i = startI; i <= lastI; i++) {
										if (newSelected) {
											uiState.selectedImportResources.add(resources[i]);
										} else {
											uiState.selectedImportResources.delete(resources[i]);
										}
									}
								});
							}}/>
					</Column>
				</Row>
				{uiState.showAutoInsertTools &&
				<Row sel style={{background: "rgba(0,0,0,.3)", padding: 3}}>
					<Text>Path:</Text>
					{insertPath.map((segment, segmentIndex)=>{
						const prevResolvedNodeID = segmentIndex == 0 ? rootNodeForImport.id : insertPath_resolvedNodeIDs[segmentIndex - 1];
						const prevResolvedNode = GetNodeL2(prevResolvedNodeID);
						const resolvedNodeID = insertPath_resolvedNodeIDs[segmentIndex];
						return (
							<Row center key={segmentIndex}
								style={E(
									{marginLeft: 5, padding: "0 3px", borderRadius: 5, cursor: "pointer"},
									!resolvedNodeID && {background: "rgba(255,0,0,.5)"},
									resolvedNodeID && {background: "rgba(0,255,0,.5)"},
								)}
								onClick={()=>{
									if (prevResolvedNodeID && !resolvedNodeID && res instanceof IR_NodeAndRevision) {
										ShowMessageBox({
											cancelButton: true,
											title: "Create this category node?",
											message: `
												Parent:${prevResolvedNode ? GetNodeDisplayText(prevResolvedNode, null, map) : "n/a"} (id: ${prevResolvedNodeID})
												NewNode:${segment}
											`.AsMultiline(0),
											onOK: async()=>{
												const success = await CreateAncestorForResource(res, map?.id, prevResolvedNodeID, segment, res.node.accessPolicy);
												if (success) {
													//await command.RunOnServer();
													onNodeCreated();
												} else {
													AddNotificationMessage(`Could not create ancestor "${segment}".`);
												}
											},
										});
									}
								}}
							>
								{segment}
							</Row>
						);
					})}
					<Row ml="auto">
						{res instanceof IR_NodeAndRevision &&
						<>
							<Button text="Create" p="0 10px" enabled={insertPath_resolvedNodeIDs.Last() != null} onClick={async()=>{
								await CreateResource(res, map?.id, insertPath_resolvedNodeIDs.LastOrX() ?? rootNodeForImport.id);
								onNodeCreated();
							}}/>
						</>}
					</Row>
				</Row>}
			</Column>
		);
	}
}

export const ResolveNodeIDsForInsertPath = CreateAccessor((rootNodeID: string, insertPath: string[])=>{
	const resolvedNodeIDs = [] as (string|null)[];
	for (const segment of insertPath) {
		const prevNodeID = resolvedNodeIDs.length == 0 ? rootNodeID : resolvedNodeIDs.Last();
		const prevNodeChildren = prevNodeID != null ? GetNodeChildrenL2(prevNodeID) : [];
		const nodeForSegment = prevNodeChildren.find(a=>a.current.phrasing.text_base.trim() == segment.trim());
		resolvedNodeIDs.push(nodeForSegment?.id ?? null);
	}
	return resolvedNodeIDs;
});

export async function CreateAncestorForResource(res: ImportResource, mapID: string|n, parentIDOfNewNode: string, newNodeTitle: string, newNodeAccessPolicy: string): Promise<boolean> {
	const parentOfNewNode = await GetAsync(()=>GetNode(parentIDOfNewNode));
	if (parentOfNewNode == null) return false;
	await RunCommand_AddChildNode({
		mapID, parentID: parentIDOfNewNode,
		link: new NodeLink({
			group: parentOfNewNode.type == NodeType.category ? ChildGroup.generic : ChildGroup.freeform,
		}),
		node: AsNodeL1Input(new NodeL1({
			type: NodeType.category,
			accessPolicy: newNodeAccessPolicy,
			creator: systemUserID,
		})),
		revision: new NodeRevision({
			creator: systemUserID,
			phrasing: CullNodePhrasingToBeEmbedded(new NodePhrasing({
				text_base: newNodeTitle,
			})),
		}),
	});
	return true;
}

export async function CreateResource(res: ImportResource, mapID: string|n, parentID: string) {
	if (res instanceof IR_NodeAndRevision) {
		await RunCommand_AddChildNode({
			mapID, parentID,
			node: AsNodeL1Input(res.node), revision: res.revision, link: res.link,
		});
	}
	Assert(false, `Cannot generate command to create resource of type "${res.constructor.name}".`);
}
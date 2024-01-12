import {GetExpandedByDefaultAttachment, GetMedia, GetNodeChildren, GetNodeChildrenL3, GetNodeDisplayText, GetNodeL3, GetNodePhrasings, GetTermsAttached, HasModPermissions, NodeL2, NodeL3, NodePhrasing, NodeRevision, Media, MeID, NodeLink, Term, NodeL1, GetNodeTitleFromPhrasingAndForm, ClaimForm, NodeType} from "dm_common";
import React from "react";
import {store} from "Store";
import {DataExchangeFormat, DataExchangeFormat_entries_supportedBySubtreeExporter} from "Utils/DataFormats/DataExchangeFormat.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {gql, useQuery} from "web-vcore/nm/@apollo/client";
import {Assert, Clone, GetEntries, ModifyString, NN, StartDownload} from "web-vcore/nm/js-vextensions.js";
import {ClassKeys, CreateAccessor, GetSchemaJSON, TableNameToDocSchemaName} from "web-vcore/nm/mobx-graphlink.js";
import {Button, CheckBox, Column, Row, RowLR, Select, Spinner, Text, TextArea, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {SubtreeDataToString_CSV_Quotes, csv_quotes_includeKeys} from "Utils/DataFormats/CSV/CSV_Quotes.js";
import {SubtreeDataToString_CSV_Basic, csv_basic_includeKeys} from "Utils/DataFormats/CSV/CSV_Basic.js";
import {ExportRetrievalMethod} from "../../../../../Store/main/maps.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";
import {ConvertLocalSubtreeDataToServerStructure, GetServerSubtreeData_GQLQuery, PopulateLocalSubtreeData, SubtreeData_Server, SubtreeIncludeKeys} from "./Dialogs/SubtreeExportHelpers.js";

@Observer
export class MI_ExportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {node, path, map} = this.props;
		const sharedProps = this.props as MI_SharedProps;
		if (!HasModPermissions(MeID())) return null; // for now, require mod permissions (since no quotas and such are in place)
		return (
			<VMenuItem text="Export subtree" style={liveSkin.Style_VMenuItem()} onClick={async e=>{
				if (e.button != 0) return;
				let ui: ExportSubtreeUI|n;
				const controller = ShowMessageBox({
					title: `Export subtree under "${GetNodeDisplayText(node, path, map)}"`,
					okButton: false, buttonBarStyle: {display: "none"},
					message: ()=><ExportSubtreeUI ref={c=>ui = c} {...sharedProps} controller={controller}/>,
				});
			}}/>
		);
	}
}

enum ExportSubtreeUI_MidTab {
	Nodes = 10,
	Others = 20,
}

@Observer
class ExportSubtreeUI extends BaseComponentPlus(
	{} as {controller: BoxController} & MI_SharedProps,
	{
		getData: false,
		tab: ExportSubtreeUI_MidTab.Nodes,
		nodesToLink: {} as {[key: string]: string},
		error: null as string|n, dbUpdates: null,
		includeKeys: new SubtreeIncludeKeys(),
	},
	) {
	render() {
		const {mapID, node: rootNode, path: rootNodePath, controller} = this.props;
		const {getData, tab, nodesToLink, error, dbUpdates, includeKeys} = this.state;
		const dialogState = store.main.maps.exportSubtreeDialog;

		let includeKeys_final = Clone(includeKeys);
		// for the export formats below, we only need a specific subset of the data
		if (dialogState.targetFormat == DataExchangeFormat.csv_basic) includeKeys_final = csv_basic_includeKeys;
		else if (dialogState.targetFormat == DataExchangeFormat.csv_quotes) includeKeys_final = csv_quotes_includeKeys;

		// todo: if this fails authentication, use query-fetching approach seen in Admin.tsx for db-backups
		const {data: queryData, loading, refetch} = useQuery(GetServerSubtreeData_GQLQuery(rootNode.id, dialogState.maxExportDepth, includeKeys_final), {
			skip: dialogState.retrievalMethod != ExportRetrievalMethod.server || !getData,
			// not sure if these are needed
			fetchPolicy: "no-cache",
			nextFetchPolicy: "no-cache",
		});

		let subtreeData: SubtreeData_Server|n;
		if (getData) {
			if (dialogState.retrievalMethod == ExportRetrievalMethod.server) {
				subtreeData = queryData?.subtree;
			} else {
				const subtreeData_local = PopulateLocalSubtreeData(rootNodePath, {maxDepth: dialogState.maxExportDepth});
				subtreeData = ConvertLocalSubtreeDataToServerStructure(subtreeData_local);
			}
		}

		let subtreeData_string: string|n;
		if (getData && subtreeData != null) {
			if (dialogState.targetFormat == DataExchangeFormat.json_dm) {
				subtreeData_string = JSON.stringify({
					nodes: subtreeData.nodes!.map(node=>node.IncludeKeys(...includeKeys.nodes)),
					nodeLinks: subtreeData.nodeLinks!.map(link=>link.IncludeKeys(...includeKeys.nodeLinks)),
					nodeRevisions: subtreeData.nodeRevisions!.map(revision=>revision.IncludeKeys(...includeKeys.nodeRevisions)),
					nodePhrasings: subtreeData.nodePhrasings!.map(phrasing=>phrasing.IncludeKeys(...includeKeys.nodePhrasings)),
					terms: subtreeData.terms!.map(term=>term.IncludeKeys(...includeKeys.terms)),
					medias: subtreeData.medias!.map(media=>media.IncludeKeys(...includeKeys.medias)),
				}, null, "\t");
				/*, (key, value)=>{
					// also apply include-keys filtering to embedded links/revisions/phrasings
					if (key == "link" && typeof value == "object") return value.IncludeKeys(...includeKeys.nodeLinks);
					if (key == "current") return value.IncludeKeys(...includeKeys.nodeRevisions);
					if (key == "phrasing") return value.IncludeKeys(...includeKeys.nodePhrasings);
					return value;
				}, "\t");*/
			} else if (dialogState.targetFormat == DataExchangeFormat.csv_basic) {
				subtreeData_string = SubtreeDataToString_CSV_Basic(subtreeData, rootNode, dialogState.maxExportDepth);
			} else if (dialogState.targetFormat == DataExchangeFormat.csv_quotes) {
				subtreeData_string = SubtreeDataToString_CSV_Quotes(subtreeData, rootNode, dialogState.maxExportDepth);
			}
		}

		const splitAt = 140;
		//const Change = (..._)=>this.Update();
		return (
			<Column style={{width: /*1500*/ 1000, height: 700}}>
				<Row style={{flex: 1, minHeight: 0}}>
					<Column style={{width: 500}}>
						<RowLR splitAt={splitAt}>
							<Text>Retrieval method:</Text>
							<Select ml={5} options={GetEntries(ExportRetrievalMethod)} value={dialogState.retrievalMethod} onChange={val=>RunInAction_Set(this, ()=>dialogState.retrievalMethod = val)}/>
						</RowLR>
						<RowLR mt={5} splitAt={splitAt}>
							<Row center>
								<Text>Max export depth:</Text>
								<InfoButton ml={5} text={`
									Value of 0 means exporting only the right-clicked node's own data; value of 1 means that root-node and its direct children; etc.
									Important: Each "argument" (including "single-premise argument", which shares a box with its premise in the UI) counts as a step (ie. 1 depth), so adjust the max-depth accordingly.
								`.AsMultiline(0)}/>
							</Row>
							<Spinner ml={5} min={0} max={30} value={dialogState.maxExportDepth} onChange={val=>RunInAction_Set(this, ()=>dialogState.maxExportDepth = val)}/>
						</RowLR>
						<RowLR mt={5} splitAt={splitAt}>
							<Text>Target format:</Text>
							<Select ml={5} options={DataExchangeFormat_entries_supportedBySubtreeExporter} value={dialogState.targetFormat} onChange={val=>RunInAction_Set(this, ()=>dialogState.targetFormat = val)}/>
						</RowLR>
						{dialogState.targetFormat == DataExchangeFormat.json_dm && <>
							<Row mt={5}>Include keys:</Row>
							{Object.keys(includeKeys).map(tableName=>{
								const docSchemaName = TableNameToDocSchemaName(tableName);
								const schema = GetSchemaJSON(docSchemaName);
								const fieldNames = Object.keys(schema.properties!);
								// for "nodes" collection, include extra fields attached for NodeL3 (if retrieval method is on-client)
								/*if (tableName == "nodes" && dialogState.retrievalMethod == ExportRetrievalMethod.client) {
									fieldNames.push("policy", "current", "displayPolarity", "link");
								}*/
								const fieldNames_oldEnabled = includeKeys[tableName];

								const splitAt_includeKeys = 120;
								return (
									<RowLR key={tableName} mt={10} splitAt={splitAt_includeKeys} rightStyle={{flexWrap: "wrap", columnGap: 5}}>
										<Text>{ModifyString(tableName, m=>[m.startLower_to_upper, m.lowerUpper_to_lowerSpaceLower])}:</Text>
										{/*<TextInput value={includeKeys[tableName].join(", ")} onChange={val=>Change(includeKeys[tableName] = val.split(",").map(a=>a.trim()) as any)}/>*/}
										{fieldNames.map(fieldName=>{
											return (
												<CheckBox key={fieldName} text={fieldName} value={includeKeys[tableName].includes(fieldName)} onChange={val=>{
													includeKeys[tableName] = fieldNames.filter(a=>(a == fieldName ? val : fieldNames_oldEnabled.includes(a)));
													this.Update();
												}}/>
											);
										})}
									</RowLR>
								);
							})}
						</>}
					</Column>
					{/*<Column style={{width: 500, padding: "0 5px"}}>
						<Row>
							<Select displayType="button bar" options={GetEntries(ExportSubtreeUI_MidTab)} value={tab} onChange={val=>this.SetState({tab: val})}/>
						</Row>
						{tab == ExportSubtreeUI_MidTab.Nodes &&
						<>
						</>}
						{tab == ExportSubtreeUI_MidTab.Others &&
						<>
						</>}
					</Column>*/}
					<Column style={{width: 500}}>
						<Row>Data:</Row>
						<TextArea value={subtreeData_string ?? ""} style={{flex: 1}} editable={false}/>
					</Column>
				</Row>
				<Row mt={5}>
					<CheckBox text="Get data" value={getData} onChange={val=>this.SetState({getData: val})}/>
					<Button ml={5} text="Download data" enabled={(subtreeData_string?.length ?? 0) > 0} onClick={()=>{
						StartDownload(subtreeData_string!, DataExchangeFormat[dialogState.targetFormat].includes("csv") ? "Data.csv" : "Data.json");
						/*ShowMessageBox({
							title: "Data downloaded",
							message: `Completed export of subtree.`,
						});*/
					}}/>
					<Button ml="auto" text="Close" onClick={()=>{
						controller.Close();
					}}/>
				</Row>
			</Column>
		);
	}
}
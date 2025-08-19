import {store} from "Store";
import {SubtreeDataToString_CSV_Basic, csv_basic_includeKeys} from "Utils/DataFormats/CSV/CSV_Basic.js";
import {SubtreeDataToString_CSV_Quotes, csv_quotes_includeKeys} from "Utils/DataFormats/CSV/CSV_Quotes.js";
import {DataExchangeFormat, DataExchangeFormat_entries_supportedBySubtreeExporter} from "Utils/DataFormats/DataExchangeFormat.js";
import React, {useReducer, useState} from "react";
import {RunInAction_Set} from "web-vcore";
import {Clone, ModifyString, StartDownload} from "js-vextensions";
import {GetSchemaJSON, TableNameToDocSchemaName} from "mobx-graphlink";
import {Button, CheckBox, Column, Row, RowLR, Select, Text, TextArea} from "react-vcomponents";
import {MI_SharedProps} from "../../NodeUI_Menu.js";
import {useSubtreeRetrievalQueryOrAccessors} from "../MI_SubtreeOps.js";
import {observer_mgl} from "mobx-graphlink";

enum ExportSubtreeUI_MidTab {
	Nodes = 10,
	Others = 20,
}

const splitAt = 120;
const splitAt_includeKeys = 120;

export const SubtreeOpsUI_Export_Left = observer_mgl((props: MI_SharedProps)=>{
	const [_, reRender] = useReducer(a=>a+1, 0);
	const [tab, setTab] = useState(ExportSubtreeUI_MidTab.Nodes);
	const dialogState = store.main.maps.subtreeOperationsDialog;
	const includeKeys = dialogState.export_includeKeys;

	return (
		<>
			<RowLR mt={5} splitAt={splitAt}>
				<Text>Target format:</Text>
				<Select ml={5} options={DataExchangeFormat_entries_supportedBySubtreeExporter} value={dialogState.targetFormat} onChange={val=>RunInAction_Set(()=>dialogState.targetFormat = val)}/>
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

					return (
						<RowLR key={tableName} mt={10} splitAt={splitAt_includeKeys} rightStyle={{flexWrap: "wrap", columnGap: 5}}>
							<Text>{ModifyString(tableName, m=>[m.startLower_to_upper, m.lowerUpper_to_lowerSpaceLower])}:</Text>
							{/*<TextInput value={includeKeys[tableName].join(", ")} onChange={val=>Change(includeKeys[tableName] = val.split(",").map(a=>a.trim()) as any)}/>*/}
							{fieldNames.map(fieldName=>{
								return (
									<CheckBox key={fieldName} text={fieldName} value={includeKeys[tableName].includes(fieldName)} onChange={val=>{
										RunInAction_Set(()=>{
											includeKeys[tableName] = fieldNames.filter(a=>(a == fieldName ? val : fieldNames_oldEnabled.includes(a)));
										});
										reRender();
									}}/>
								);
							})}
						</RowLR>
					);
				})}
			</>}
		</>
	);

});

export const SubtreeOpsUI_Export_Right = observer_mgl((props: MI_SharedProps)=>{
	const {mapID, node: rootNode, path: rootNodePath} = props;
	const [retrievalActive, setRetrievalActive] = useState(false);

	const dialogState = store.main.maps.subtreeOperationsDialog;
	const includeKeys_userSet = dialogState.export_includeKeys;
	let includeKeys = Clone(includeKeys_userSet);

	// for the export formats below, we only need a specific subset of the data (selector ui also not shown for these formats)
	if (dialogState.targetFormat == DataExchangeFormat.csv_basic) includeKeys = csv_basic_includeKeys;
	else if (dialogState.targetFormat == DataExchangeFormat.csv_quotes) includeKeys = csv_quotes_includeKeys;

	const {subtreeData} = useSubtreeRetrievalQueryOrAccessors(rootNode, rootNodePath, includeKeys, dialogState.retrievalMethod, dialogState.maxExportDepth, retrievalActive);

	let subtreeData_string: string|n;
	if (retrievalActive && subtreeData != null) {
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

	return (
		<Column style={{flex: 1}}>
			<Row>
				<CheckBox text="Start retrieval" value={retrievalActive} onChange={val=>setRetrievalActive(val)}/>
				<Button ml="auto" text="Download data" enabled={(subtreeData_string?.length ?? 0) > 0} onClick={()=>{
					StartDownload(subtreeData_string!, DataExchangeFormat[dialogState.targetFormat].includes("csv") ? "Data.csv" : "Data.json");
				}}/>
			</Row>
			<Row>Data:</Row>
			<TextArea value={subtreeData_string ?? ""} style={{flex: 1}} editable={false}/>
		</Column>
	);
});

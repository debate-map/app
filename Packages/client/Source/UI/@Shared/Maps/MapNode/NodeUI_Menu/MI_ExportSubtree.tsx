import {GetMedia, GetNodeChildren, GetNodeChildrenL3, GetNodeDisplayText, GetNodeL3, GetNodePhrasings, GetTermsAttached, HasModPermissions, MapNodeL2, MapNodeL3, MapNodePhrasing, MapNodeRevision, Media, MeID, NodeChildLink, Term} from "dm_common";
import React from "react";
import {store} from "Store";
import {DataExchangeFormat} from "Store/main/maps";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {Clone, GetEntries, ModifyString, NN, StartDownload} from "web-vcore/nm/js-vextensions.js";
import {ClassKeys, CreateAccessor, GetSchemaJSON, TableNameToDocSchemaName} from "web-vcore/nm/mobx-graphlink.js";
import {Button, CheckBox, Column, Row, RowLR, Select, Spinner, Text, TextArea, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {Assert} from "../../../../../../../../../../@Modules/web-vcore/Main/node_modules/react-vextensions/Dist/Internals/FromJSVE.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_ExportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const {node, path} = this.props;
		const sharedProps = this.props as MI_SharedProps;
		if (!HasModPermissions(MeID())) return null; // for now, require mod permissions (since no quotas and such are in place)
		return (
			<VMenuItem text="Export subtree" style={liveSkin.Style_VMenuItem()} onClick={async e=>{
				if (e.button != 0) return;
				let ui: ExportSubtreeUI|n;
				const controller = ShowMessageBox({
					title: `Export subtree under "${GetNodeDisplayText(node, path)}"`,
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

export function CSVCell(text: string) {
	let result = text;
	text = text.trim(); // remove extra spaces at start/end (dunno why, but some users seem to add them fairly frequently)
	if (result.includes(`"`)) result = result.replace(/"/g, `\\"`);
	if (result.includes(",")) result = `"${result}"`;
	return result;
}

@Observer
class ExportSubtreeUI extends BaseComponentPlus(
	{} as {controller: BoxController} & MI_SharedProps,
	{
		getData: false,
		tab: ExportSubtreeUI_MidTab.Nodes,
		nodesToLink: {} as {[key: string]: string},
		error: null as string|n, dbUpdates: null,
		/*ignoreKeys: {
			nodes: ClassKeys<MapNodeL3>("creator", "createdAt", "accessPolicy", "policy", "current", "displayPolarity", "link"),
			nodeChildLinks: ClassKeys<NodeChildLink>("creator", "createdAt", "c_parentType", "c_childType", "_mirrorLink", "seriesAnchor", "seriesEnd", "slot"),
			nodeRevisions: ClassKeys<MapNodeRevision>("creator", "createdAt", "displayDetails", "equation", "phrasing_tsvector", "quote"),
			nodePhrasings: ClassKeys<MapNodePhrasing>("creator", "createdAt"),
			terms: ClassKeys<Term>("creator", "createdAt"),
			medias: ClassKeys<Media>("creator", "createdAt", "accessPolicy"),
		},*/
		includeKeys: {
			nodes: ClassKeys<MapNodeL3>("id", "type", "rootNodeForMap", "c_currentRevision", "multiPremiseArgument", "argumentType"),
			nodeChildLinks: ClassKeys<NodeChildLink>("id", "parent", "child", "form", "polarity"),
			nodeRevisions: ClassKeys<MapNodeRevision>("id", "node", "phrasing", "note", "references", "media"),
			nodePhrasings: ClassKeys<MapNodePhrasing>("id", "node", "type", "text_base", "text_negation", "text_question", "note", "terms", "references"),
			terms: ClassKeys<Term>("id", "name", "forms", "disambiguation", "type", "definition", "note"),
			medias: ClassKeys<Media>("id", "name", "type", "url", "description"),
		},
	},
	) {
	render() {
		const {mapID, node, path, controller} = this.props;
		const {getData, tab, nodesToLink, error, dbUpdates, includeKeys} = this.state;
		const dialogState = store.main.maps.exportSubtreeDialog;

		let subtreeExportData: string|n;
		if (getData) {
			var searchInfo = PopulateSearchInfoUsingSubtree(path, {maxDepth: dialogState.maxExportDepth});
			if (dialogState.targetFormat == DataExchangeFormat.dm_json) {
				subtreeExportData = JSON.stringify({
					// todo: make-so the UI lets you choose which fields to keep, whether to include old node-revisions, etc.
					nodes: [...searchInfo.nodes.values()].map(node=>node.IncludeKeys(...includeKeys.nodes)),
					nodeChildLinks: [...searchInfo.nodeChildLinks.values()].map(link=>link.IncludeKeys(...includeKeys.nodeChildLinks)),
					nodeRevisions: [...searchInfo.nodeRevisions.values()].map(revision=>revision.IncludeKeys(...includeKeys.nodeRevisions)),
					nodePhrasings: [...searchInfo.nodePhrasings.values()].map(phrasing=>phrasing.IncludeKeys(...includeKeys.nodePhrasings)),
					terms: [...searchInfo.terms.values()].map(term=>term.IncludeKeys(...includeKeys.terms)),
					medias: [...searchInfo.medias.values()].map(media=>media.IncludeKeys(...includeKeys.medias)),
				}, (key, value)=>{
					// also apply include-keys filtering to embedded links/revisions/phrasings
					if (key == "link" && typeof value == "object") return value.IncludeKeys(...includeKeys.nodeChildLinks);
					if (key == "current") return value.IncludeKeys(...includeKeys.nodeRevisions);
					if (key == "phrasing") return value.IncludeKeys(...includeKeys.nodePhrasings);
					return value;
				}, "\t");
			}
			/*} else if (dialogState.targetFormat == DataExchangeFormat.gad_csv) {
				const positions = subtree.childrenData.VValues();
				subtreeExportData = positions.map(position=>{
					const categories = position.childrenData.VValues();
					return categories.map((category, categoryIndex)=>{
						const subcategories = category.childrenData.VValues();
						const cells = [] as string[];
						cells.push(CSVCell(categoryIndex == 0 ? GetNodeDisplayText(position) : ""));
						cells.push(CSVCell(GetNodeDisplayText(category)));
						cells.push(...subcategories.map(subcategory=>{
							return CSVCell(GetNodeDisplayText(subcategory));
						}));
						return cells.join(",");
					}).join("\n");
				}).join("\n");
			}*/
		}

		const splitAt = 140;
		//const Change = (..._)=>this.Update();
		return (
			<Column style={{width: /*1500*/ 1000, height: 700}}>
				<Row style={{flex: 1, minHeight: 0}}>
					<Column style={{width: 500}}>
						<RowLR splitAt={splitAt}>
							<Text>Target format:</Text>
							<Select ml={5} options={GetEntries(DataExchangeFormat)} value={dialogState.targetFormat} onChange={val=>RunInAction_Set(this, ()=>dialogState.targetFormat = val)}/>
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
						<Row mt={5}>Include keys:</Row>
						{Object.keys(includeKeys).map(tableName=>{
							const docSchemaName = TableNameToDocSchemaName(tableName);
							const schema = GetSchemaJSON(docSchemaName);
							const fieldNames = Object.keys(schema.properties!);
							if (tableName == "nodes") fieldNames.push("policy", "current", "displayPolarity", "link"); // extra fields attached for MapNodeL3
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
						<TextArea value={subtreeExportData ?? ""} style={{flex: 1}} editable={false}/>
					</Column>
				</Row>
				<Row mt={5}>
					<CheckBox text="Get data" value={getData} onChange={val=>this.SetState({getData: val})}/>
					<Button ml={5} text="Download data" enabled={(subtreeExportData?.length ?? 0) > 0} onClick={()=>{
						StartDownload(subtreeExportData!, DataExchangeFormat[dialogState.targetFormat].endsWith("_CSV") ? "Data.csv" : "Data.json");
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

export class GetSubtree_SearchConfig {
	maxDepth: number;
	//simplifyOutput: boolean;
}
export class GetSubtree_SearchInfo {
	constructor(data: Partial<GetSubtree_SearchInfo>) {
		this.VSet(data);
	}

	// temp
	rootPathSegments: string[];
	//nodes_nextToProcess: MapNodeL2[] = [];

	// result
	nodes = new Map<string, MapNodeL3>();
	nodeChildLinks = new Map<string, NodeChildLink>();
	nodeRevisions = new Map<string, MapNodeRevision>();
	nodePhrasings = new Map<string, MapNodePhrasing>();
	terms = new Map<string, Term>();
	medias = new Map<string, Media>();
}

const PopulateSearchInfoUsingSubtree = CreateAccessor((currentPath: string, searchConfig: GetSubtree_SearchConfig, searchInfo?: GetSubtree_SearchInfo)=>{
	const pathSegments = currentPath.split("/");
	searchInfo = searchInfo ?? new GetSubtree_SearchInfo({rootPathSegments: pathSegments});

	const node = NN(GetNodeL3(currentPath));

	// check link first, because link can differ depending on path (ie. even if node has been seen, this link may not have been)
	const isSubtreeRoot = pathSegments.join("/") == searchInfo.rootPathSegments.join("/");
	if (node.link && !isSubtreeRoot && !searchInfo.nodeChildLinks.has(node.link.id)) searchInfo.nodeChildLinks.set(node.link.id, node.link);

	// now check if node itself has been seen/processed; if so, ignore the rest of its data
	if (searchInfo.nodes.has(node.id)) return searchInfo;
	searchInfo.nodes.set(node.id, node);

	Assert(!searchInfo.nodeRevisions.has(node.current.id), `Node-revisions should be node-specific, yet entry (${node.current.id}) was seen twice.`);
	searchInfo.nodeRevisions.set(node.current.id, node.current);

	const phrasings = GetNodePhrasings(node.id);
	for (const phrasing of phrasings) {
		Assert(!searchInfo.nodePhrasings.has(phrasing.id), `Node-phrasings should be node-specific, yet entry (${phrasing.id}) was seen twice.`);
		searchInfo.nodePhrasings.set(phrasing.id, phrasing);
	}

	const terms = GetTermsAttached(node.current.id);
	for (const term of terms) {
		if (!searchInfo.terms.has(term.id)) searchInfo.terms.set(term.id, term);
	}

	if (node.current.media && !searchInfo.terms.has(node.current.media.id)) {
		const media = GetMedia(node.current.media.id)!;
		searchInfo.medias.set(media.id, media);
	}

	const currentDepth = pathSegments.length - searchInfo.rootPathSegments.length;
	if (currentDepth < searchConfig.maxDepth) {
		for (const child of GetNodeChildren(node.id, currentPath)) {
			PopulateSearchInfoUsingSubtree(`${currentPath}/${child.id}`, searchConfig, searchInfo);
		}
	}
	return searchInfo;
});
/*async function LogSelectedSubtree() {
	let state = store.getState();
	let selectedPath = RR.GetSelectedNodePath(state.main.page == "global" ? RR.globalMapID : state.main[state.main.page].selectedMapID);
	let subtree = await GetAsync(()=>{
		let selectedNode = RR.GetNodeL3(selectedPath);
		let selectedNode_parent = RR.GetParentNodeL3(selectedPath);
		let selectedPath_final = selectedPath;
		if (RR.IsPremiseOfSinglePremiseArgument(selectedNode, selectedNode_parent)) {
			selectedPath_final = RR.SlicePath(selectedPath, 1);
		}
		return GetSubtree(selectedPath_final);
	});
	console.log(ToJSON(subtree));
}*/
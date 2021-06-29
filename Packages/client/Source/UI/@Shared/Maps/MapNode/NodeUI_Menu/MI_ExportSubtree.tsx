import {GetNodeChildrenL3, GetNodeDisplayText, GetNodeL3, HasModPermissions, MapNodeL3, MeID} from "dm_common";
import {store} from "Store";
import {DataExchangeFormat} from "Store/main/maps";
import {styles} from "Utils/UI/GlobalStyles.js";
import {Observer, RunInAction_Set} from "web-vcore";
import {Clone, GetEntries, StartDownload} from "web-vcore/nm/js-vextensions.js";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {Button, CheckBox, Column, Row, Select, Spinner, Text, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem} from "web-vcore/nm/react-vmenu.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {MI_SharedProps} from "../NodeUI_Menu.js";

@Observer
export class MI_ExportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		let {node, path} = this.props;
		const sharedProps = this.props as MI_SharedProps;
		if (!HasModPermissions(MeID())) return null; // for now, require mod permissions (since no quotas and such are in place)
		return (
			<VMenuItem text="Export subtree" style={styles.vMenuItem} onClick={async e=>{
				if (e.button != 0) return;
				let ui: ExportSubtreeUI;
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
		error: null as string, dbUpdates: null,
	},
	) {
	render() {
		const {mapID, node, path, controller} = this.props;
		const {getData, tab, nodesToLink, error, dbUpdates} = this.state;
		const dialogState = store.main.maps.exportSubtreeDialog;

		let subtreeExportData: string;
		if (getData) {
			var subtree = GetSubtree(path, dialogState.baseExportDepth);
			if (dialogState.targetFormat == DataExchangeFormat.gad_csv) {
				let positions = subtree.childrenData.VValues();
				subtreeExportData = positions.map(position=> {
					let categories = position.childrenData.VValues();
					return categories.map((category, categoryIndex)=> {
						let subcategories = category.childrenData.VValues();
						let cells = [];
						cells.push(CSVCell(categoryIndex == 0 ? GetNodeDisplayText(position) : ""));
						cells.push(CSVCell(GetNodeDisplayText(category)));
						cells.push(...subcategories.map(subcategory=> {
							return CSVCell(GetNodeDisplayText(subcategory));
						}));
						return cells.join(",");
					}).join("\n");
				}).join("\n");
			}
		}

		return (
			<Column style={{width: /*1500*/ 1000, height: 700}}>
				<Row style={{flex: 1, minHeight: 0}}>
					<Column style={{width: 300}}>
						<Row>
							<Text>Target format:</Text>
							<Select ml={5} options={GetEntries(DataExchangeFormat)} value={dialogState.targetFormat} onChange={val=>RunInAction_Set(this, ()=>dialogState.targetFormat = val)}/>
						</Row>
						<Row mt={5}>
							<Text>Base export depth:</Text>
							<Spinner ml={5} min={0} max={30} value={dialogState.baseExportDepth} onChange={val=>RunInAction_Set(this, ()=>dialogState.baseExportDepth = val)}/>
						</Row>
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
					<Column style={{width: 700}}>
						<Row>Data:</Row>
						<TextArea value={subtreeExportData} style={{flex: 1}} editable={false}/>
					</Column>
				</Row>
				<Row mt={5}>
					<CheckBox text="Get data" value={getData} onChange={val=>this.SetState({getData: val})}/>
					<Button ml={5} text="Download data" enabled={subtreeExportData?.length > 0} onClick={()=>{
						StartDownload(subtreeExportData, DataExchangeFormat[dialogState.targetFormat].endsWith("_CSV") ? "Data.csv" : "Data.json");
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

type SubtreeNode = MapNodeL3 & {
	childrenData: {[key: string]: SubtreeNode};
};

const GetSubtree = StoreAccessor(s=>(path: string, maxDepth: number, rootPathSegments?: string[])=>{
	const pathSegments = path.split("/");
	if (rootPathSegments == null) rootPathSegments = pathSegments;

	const nodeL3 = GetNodeL3(path);
	const result = Clone(nodeL3) as SubtreeNode;
	/*result.ratings = GetNodeRatingsRoot(nodeL3._id);
	if (result.ratings == null) delete result.ratings;*/

	const currentDepth = pathSegments.length - rootPathSegments.length;
	if (currentDepth < maxDepth) {
		result.childrenData = {};
		for (const child of GetNodeChildrenL3(nodeL3.id, path)) {
			if (child == null) continue; // not yet loaded
			if (pathSegments.Contains(child.id)) continue; // avoid loops
			result.childrenData[child.id] = GetSubtree(`${path}/${child.id}`, maxDepth, rootPathSegments);
		}
	}

	return result;
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
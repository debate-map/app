// import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
// import {Observer, TreeView} from "web-vcore";
// import {VMenuItem} from "web-vcore/nm/react-vmenu";
// import {styles, ES} from "Utils/UI/GlobalStyles";
// import {ShowMessageBox, BoxController} from "web-vcore/nm/react-vmessagebox";
// import {Column, Row, TextArea, Button, CheckBox, Select, Text, TextInput} from "web-vcore/nm/react-vcomponents";
// import {FromJSON, ToJSON, CE, Clone, GetEntries} from "web-vcore/nm/js-vextensions";
// import {MI_SharedProps} from "../NodeUI_Menu";
// import {ApplyDBUpdates} from "web-vcore/nm/mobx-graphlink";
// import {ScrollView} from "web-vcore/nm/react-vscrollview";
// import {store} from "Store";
// import {runInAction} from "web-vcore/nm/mobx";
// import {HasModPermissions, HasAdminPermissions} from "dm_common";
// import {MeID} from "dm_common";
// import {GetNodeID, GetNodesByTitle} from "dm_common";
// import {AddChildNode} from "dm_common";
// import {ImportSubtree} from "dm_common";

// @Observer
// export class MI_ImportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
// 	render() {
// 		// temp; till export-subtree and import-subtree systems get rewritten
// 		if (true) return null;
		
// 		const sharedProps = this.props as MI_SharedProps;
// 		if (!HasAdminPermissions(MeID())) return null;
// 		return (
// 			<VMenuItem text="Import subtree" style={styles.vMenuItem} onClick={async e=>{
// 				if (e.button != 0) return;
// 				let ui: ImportSubtreeUI;
// 				let controller = ShowMessageBox({
// 					title: `Import subtree`,
// 					okButton: false, buttonBarStyle: {display: "none"},
// 					message: ()=><ImportSubtreeUI ref={c=>ui = c} {...sharedProps} controller={controller}/>,
// 				});
// 			}}/>
// 		);
// 	}
// }

// type SubtreeExportData_Old = any;

// enum ImportSubtreeUI_MidTab {
// 	Nodes = 10,
// 	Others = 20,
// }

// @Observer
// class ImportSubtreeUI extends BaseComponentPlus(
// 	{} as {controller: BoxController} & MI_SharedProps,
// 	{
// 		subtreeJSON: "",
// 		tab: ImportSubtreeUI_MidTab.Nodes,
// 		nodesToLink: {} as {[key: string]: string},
// 		error: null as string, dbUpdates: null,
// 	},
// ) {
// 	importCommand: ImportSubtree;
// 	render() {
// 		const {mapID, node, path, controller} = this.props;
// 		const {subtreeJSON, tab, nodesToLink, error, dbUpdates} = this.state;
// 		let dialogState = store.main.maps.importSubtreeDialog;

// 		let subtreeData;
// 		let newNodes = [] as SubtreeExportData_Old[];
// 		try {
// 			subtreeData = FromJSON(subtreeJSON) as SubtreeExportData_Old;
// 			//newNodeTitles = GetNodeTitlesInSubtree(subtreeData);
// 			newNodes = GetNodesInSubtree(subtreeData);
// 		} catch {}
// 		return (
// 			<Column style={{width: 1500, height: 700}}>
// 				<Row style={{flex: 1, minHeight: 0}}>
// 					<Column style={{width: 500}}>
// 						<Row>Subtree JSON:</Row>
// 						<TextArea value={subtreeJSON} style={{flex: 1}} onChange={val=>this.SetState({subtreeJSON: val})}/>
// 					</Column>
// 					<Column style={{width: 500, padding: "0 5px"}}>
// 						<Row>
// 							<Select displayType="button bar" options={GetEntries(ImportSubtreeUI_MidTab)} value={tab} onChange={val=>this.SetState({tab: val})}/>
// 						</Row>
// 						{tab == ImportSubtreeUI_MidTab.Nodes &&
// 						<>
// 							<Row mt={5}>New nodes{newNodes.length ? ` (${newNodes.length})` : ""}: (checked: link existing, instead of creating new)</Row>
// 							{/*newNodes.map((node, index)=> {
// 								let title = node.current.titles.base || "(empty title)";
// 								return (
// 									<Row key={index} style={{whiteSpace: "normal"}}>
// 										<CheckBox text={title} value={nodesToLink.includes(node.id)} enabled={GetNodesByTitle(title, "base").length > 0} onChange={val=> {
// 											if (val) {
// 												this.SetState({nodesToLink: nodesToLink.concat(node.id)})
// 											} else {
// 												this.SetState({nodesToLink: nodesToLink.Except(node.id)})
// 											}
// 										}}/>
// 									</Row>
// 								)
// 							})*/}
// 							<ScrollView style={ES({flex: 1})}>
// 								{subtreeData &&
// 									<SubtreeTreeView node={subtreeData} path={[subtreeData.id]} nodesToLink={nodesToLink} setNodesToLink={val=>this.SetState({nodesToLink: val})}/>}
// 							</ScrollView>
// 						</>}
// 						{tab == ImportSubtreeUI_MidTab.Others &&
// 						<>
// 							<Row>
// 								<CheckBox text="Import ratings, from users:" value={dialogState.importRatings}
// 									onChange={val=>runInAction("MI_ImportSubtree.importRatings.onChange", ()=>dialogState.importRatings = val)}/>
// 								<TextInput ml={5} placeholder="Leave empty for all users..." style={{flex: 1}} value={dialogState.importRatings_userIDsStr}
// 									onChange={val=>runInAction("MI_ImportSubtree.importRatings_userIDsStr.onChange", ()=>dialogState.importRatings_userIDsStr = val)}/>
// 							</Row>
// 						</>}
// 					</Column>
// 					<Column style={{width: 500}}>
// 						<Row>DBUpdates:</Row>
// 						<TextArea value={error ?? ToJSON(dbUpdates, null, 2)} style={{flex: 1}} editable={false}/>
// 					</Column>
// 				</Row>
// 				<Row mt={5}>
// 					<Button text="GetDBUpdates" onClick={async()=>{
// 						let importRatings_userIDs = null;
// 						if (dialogState.importRatings_userIDsStr.trim().length) {
// 							importRatings_userIDs = dialogState.importRatings_userIDsStr.split(",").map(a=>a.trim());
// 						}
// 						this.importCommand = new ImportSubtree({mapID, parentNodeID: GetNodeID(path), subtreeJSON, nodesToLink, importRatings: dialogState.importRatings, importRatings_userIDs});
// 						/*try {
// 							await this.importCommand.Validate_Async();
// 						} catch (ex) {
// 							 // todo: remove need for this workaround
// 							//this.SetState({error: ex});
// 							this.SetState({error: this.importCommand.Validate_Safe()});
// 							return;
// 						}*/
// 						// todo: remove need for this workaround
// 						let error = this.importCommand.Validate_Safe();
// 						if (error) {
// 							this.SetState({error, dbUpdates: null});
// 							return;
// 						}

// 						const dbUpdates = this.importCommand.GetDBUpdates();
// 						this.SetState({error: null, dbUpdates});
// 					}}/>
// 					<Button ml={5} text="ApplyDBUpdates (direct; safer)" enabled={dbUpdates?.VKeys().length > 0} onClick={async ()=>{
// 						let result = await ApplyDBUpdates({}, dbUpdates);
// 						let nodesAdded = this.importCommand.subs.filter(a=>a instanceof AddChildNode).length;
// 						ShowMessageBox({
// 							title: "Subtree imported",
// 							message: `Completed import of subtree. Nodes added: ${nodesAdded}`,
// 						});
// 					}}/>
// 					<Button ml={5} text="ApplyDBUpdates (standard; recommended)"
// 						title="It's recommended to use the standard option, since it's what we'll need to use when we don't have unrestricted, direct client-access."
// 						enabled={dbUpdates?.VKeys().length > 0}
// 						onClick={async ()=>{
// 							let result = await this.importCommand.Run();
// 							let nodesAdded = this.importCommand.subs.filter(a=>a instanceof AddChildNode).length;
// 							ShowMessageBox({
// 								title: "Subtree imported",
// 								message: `Completed import of subtree. Nodes added: ${nodesAdded}`,
// 							});
// 						}}/>
// 					<Button ml="auto" text="Close" onClick={()=> {
// 						controller.Close();
// 					}}/>
// 				</Row>
// 			</Column>
// 		);
// 	}
// }

// /*function GetNodeTitlesInSubtree(subtreeData: SubtreeExportData_Old) {
// 	/*let result = [];
// 	let nodeTitle = subtreeData.current.titles.Excluding("_key" as any).VValues().FirstOrX(a=>a as any, "(empty title)");
// 	if (nodeTitle) result.push(nodeTitle);
	
// 	for (const pair of CE(subtreeData.childrenData).Pairs()) {
// 		result.push(...GetNodeTitlesInSubtree(pair.value));
// 	}
// 	return result;*#/
// 	let nodes = GetNodesInSubtree(subtreeData);
// 	nodes = nodes.filter((node, index)=>!nodes.slice(0, index).Any(a=>a.id == node.id)); // remove duplicate nodes
// 	//return nodes.map(node=>node.current.titles.Excluding("_key" as any).VValues().FirstOrX(a=>a as any, "(empty title)"));
// 	return nodes.map(node=>node.current.titles.base || "(empty title)");
// }*/
// function GetNodesInSubtree(subtreeData: SubtreeExportData_Old) {
// 	let result = [] as SubtreeExportData_Old[];
// 	result.push(subtreeData.Excluding("childrenData") as SubtreeExportData_Old);
// 	for (const pair of CE(subtreeData.childrenData).Pairs()) {
// 		result.push(...GetNodesInSubtree(pair.value));
// 	}
// 	return result;
// }

// @Observer
// class SubtreeTreeView extends BaseComponentPlus({} as {node: SubtreeExportData_Old, path: string[], nodesToLink: {[key: string]: string}, setNodesToLink: (newNodesToLink: {[key: string]: string})=>void}, {}) {
// 	render() {
// 		let {node, path, nodesToLink, setNodesToLink} = this.props;
// 		let title = node.current.titles.base || "(empty title)";
// 		let title_noTermBrackets = title ? title.replace(/\{(.+?)\}(\[[0-9]+?\])?/g, (m, g1, g2)=>g1) : null;
// 		let nodeMatches = GetNodesByTitle(title_noTermBrackets, "base");
		
// 		return (
// 			<TreeView title={
// 				<Row style={{whiteSpace: "normal"}}>
// 					<CheckBox text={title} value={nodesToLink[node.id] != null} enabled={nodeMatches.length > 0} onChange={val=> {
// 						let newNodesToLink = Clone(nodesToLink);
// 						if (val) {
// 							newNodesToLink[node.id] = nodeMatches[0].id;
// 						} else {
// 							delete newNodesToLink[node.id];
// 						}
// 						setNodesToLink(newNodesToLink);
// 					}}/>
// 				</Row>
// 			}>
// 				{nodesToLink[node.id] == null && node.childrenData.Pairs().map(pair=> {
// 					return <SubtreeTreeView key={pair.key} node={pair.value} path={path.concat(pair.value.id)} nodesToLink={nodesToLink} setNodesToLink={setNodesToLink}/>;
// 				})}
// 			</TreeView>
// 		);
// 	}
// }
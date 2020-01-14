import {BaseComponentPlus} from "react-vextensions";
import {Observer, TreeView} from "vwebapp-framework";
import {VMenuItem} from "react-vmenu";
import {HasModPermissions, HasAdminPermissions} from "Store/firebase/users/$user";
import {MeID} from "Store/firebase/users";
import {styles, ES} from "Utils/UI/GlobalStyles";
import {ShowMessageBox, BoxController} from "react-vmessagebox";
import {Column, Row, TextArea, Button, CheckBox} from "react-vcomponents";
import {FromJSON, ToJSON, CE, Clone} from "js-vextensions";
import {ImportSubtree_Old} from "Server/Commands/ImportSubtree_Old";
import {GetParentNodeID, GetNodeID, GetNodesByTitle} from "Store/firebase/nodes";
import {MI_SharedProps} from "../NodeUI_Menu";
import {SubtreeExportData_Old} from "./MI_ExportSubtree";
import {AddChildNode} from "Server/Commands/AddChildNode";
import {ApplyDBUpdates} from "mobx-firelink";
import {ScrollView} from "react-vscrollview";

@Observer
export class MI_ImportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const sharedProps = this.props as MI_SharedProps;
		if (!HasModPermissions(MeID())) return null;
		return (
			<VMenuItem text="Import subtree" enabled={HasAdminPermissions(MeID())} style={styles.vMenuItem} onClick={async e=>{
				if (e.button != 0) return;
				let ui: ImportSubtreeUI;
				let controller = ShowMessageBox({
					title: `Import subtree`,
					okButton: false, buttonBarStyle: {display: "none"},
					message: ()=><ImportSubtreeUI ref={c=>ui = c} {...sharedProps} controller={controller}/>,
				});
			}}/>
		);
	}
}

class ImportSubtreeUI extends BaseComponentPlus(
	{} as {controller: BoxController} & MI_SharedProps,
	{
		subtreeJSON: "",
		nodesToLink: {} as {[key: string]: string},
		error: null as string, dbUpdates: null,
	},
) {
	importCommand: ImportSubtree_Old;
	render() {
		const {mapID, node, path, controller} = this.props;
		const {subtreeJSON, nodesToLink, error, dbUpdates} = this.state;

		let subtreeData;
		let newNodes = [] as SubtreeExportData_Old[];
		try {
			subtreeData = FromJSON(subtreeJSON) as SubtreeExportData_Old;
			//newNodeTitles = GetNodeTitlesInSubtree(subtreeData);
			newNodes = GetNodesInSubtree(subtreeData);
		} catch {}
		return (
			<Column style={{width: 1500, height: 700}}>
				<Row style={{flex: 1, minHeight: 0}}>
					<Column style={{width: 500}}>
						<Row>Subtree JSON:</Row>
						<TextArea value={subtreeJSON} style={{flex: 1}} onChange={val=>this.SetState({subtreeJSON: val})}/>
					</Column>
					<Column style={{width: 500}}>
						<Row>New nodes{newNodes.length ? ` (${newNodes.length})` : ""}: (checked: link existing, instead of creating new)</Row>
						{/*newNodes.map((node, index)=> {
							let title = node.current.titles.base || "(empty title)";
							return (
								<Row key={index} style={{whiteSpace: "normal"}}>
									<CheckBox text={title} checked={nodesToLink.includes(node._key)} enabled={GetNodesByTitle(title, "base").length > 0} onChange={val=> {
										if (val) {
											this.SetState({nodesToLink: nodesToLink.concat(node._key)})
										} else {
											this.SetState({nodesToLink: nodesToLink.Except(node._key)})
										}
									}}/>
								</Row>
							)
						})*/}
						<ScrollView style={ES({flex: 1})}>
							{subtreeData &&
								<SubtreeTreeView node={subtreeData} path={[subtreeData._key]} nodesToLink={nodesToLink} setNodesToLink={val=>this.SetState({nodesToLink: val})}/>}
						</ScrollView>
					</Column>
					<Column style={{width: 500}}>
						<Row>DBUpdates:</Row>
						<TextArea value={error ?? ToJSON(dbUpdates, null, 2)} style={{flex: 1}} editable={false}/>
					</Column>
				</Row>
				<Row mt={5}>
					<Button text="GetDBUpdates" onClick={async()=>{
						this.importCommand = new ImportSubtree_Old({mapID, parentNodeID: GetNodeID(path), subtreeJSON, nodesToLink});
						/*try {
							await this.importCommand.Validate_Async();
						} catch (ex) {
							 // todo: remove need for this workaround
							//this.SetState({error: ex});
							this.SetState({error: this.importCommand.Validate_Safe()});
							return;
						}*/
						// todo: remove need for this workaround
						let error = this.importCommand.Validate_Safe();
						if (error) {
							this.SetState({error, dbUpdates: null});
							return;
						}

						const dbUpdates = this.importCommand.GetDBUpdates();
						this.SetState({error: null, dbUpdates});
					}}/>
					<Button ml={5} text="ApplyDBUpdates (direct; safer)" enabled={dbUpdates?.VKeys().length > 0} onClick={async ()=>{
						let result = await ApplyDBUpdates({}, dbUpdates);
						let nodesAdded = this.importCommand.subs.filter(a=>a instanceof AddChildNode).length;
						ShowMessageBox({
							title: "Subtree imported",
							message: `Completed import of subtree. Nodes added: ${nodesAdded}`,
						});
					}}/>
					<Button ml={5} text="ApplyDBUpdates (standard; recommended)"
						title="It's recommended to use the standard option, since it's what we'll need to use when we don't have unrestricted, direct client-access."
						enabled={dbUpdates?.VKeys().length > 0}
						onClick={async ()=>{
							let result = await this.importCommand.Run();
							let nodesAdded = this.importCommand.subs.filter(a=>a instanceof AddChildNode).length;
							ShowMessageBox({
								title: "Subtree imported",
								message: `Completed import of subtree. Nodes added: ${nodesAdded}`,
							});
						}}/>
					<Button ml="auto" text="Close" onClick={()=> {
						controller.Close();
					}}/>
				</Row>
			</Column>
		);
	}
}

/*function GetNodeTitlesInSubtree(subtreeData: SubtreeExportData_Old) {
	/*let result = [];
	let nodeTitle = subtreeData.current.titles.Excluding("_key" as any).VValues().FirstOrX(a=>a as any, "(empty title)");
	if (nodeTitle) result.push(nodeTitle);
	
	for (const pair of CE(subtreeData.childrenData).Pairs()) {
		result.push(...GetNodeTitlesInSubtree(pair.value));
	}
	return result;*#/
	let nodes = GetNodesInSubtree(subtreeData);
	nodes = nodes.filter((node, index)=>!nodes.slice(0, index).Any(a=>a._key == node._key)); // remove duplicate nodes
	//return nodes.map(node=>node.current.titles.Excluding("_key" as any).VValues().FirstOrX(a=>a as any, "(empty title)"));
	return nodes.map(node=>node.current.titles.base || "(empty title)");
}*/
function GetNodesInSubtree(subtreeData: SubtreeExportData_Old) {
	let result = [] as SubtreeExportData_Old[];
	result.push(subtreeData.Excluding("childrenData") as SubtreeExportData_Old);
	for (const pair of CE(subtreeData.childrenData).Pairs()) {
		result.push(...GetNodesInSubtree(pair.value));
	}
	return result;
}

@Observer
class SubtreeTreeView extends BaseComponentPlus({} as {node: SubtreeExportData_Old, path: string[], nodesToLink: {[key: string]: string}, setNodesToLink: (newNodesToLink: {[key: string]: string})=>void}, {}) {
	render() {
		let {node, path, nodesToLink, setNodesToLink} = this.props;
		let title = node.current.titles.base || "(empty title)";
		let title_noTermBrackets = title ? title.replace(/\{(.+?)\}(\[[0-9]+?\])?/g, (m, g1, g2)=>g1) : null;
		let nodeMatches = GetNodesByTitle(title_noTermBrackets, "base");
		
		return (
			<TreeView title={
				<Row style={{whiteSpace: "normal"}}>
					<CheckBox text={title} checked={nodesToLink[node._key] != null} enabled={nodeMatches.length > 0} onChange={val=> {
						let newNodesToLink = Clone(nodesToLink);
						if (val) {
							newNodesToLink[node._key] = nodeMatches[0]._key;
						} else {
							delete newNodesToLink[node._key];
						}
						setNodesToLink(newNodesToLink);
					}}/>
				</Row>
			}>
				{nodesToLink[node._key] == null && node.childrenData.Pairs().map(pair=> {
					return <SubtreeTreeView key={pair.key} node={pair.value} path={path.concat(pair.value._key)} nodesToLink={nodesToLink} setNodesToLink={setNodesToLink}/>;
				})}
			</TreeView>
		);
	}
}
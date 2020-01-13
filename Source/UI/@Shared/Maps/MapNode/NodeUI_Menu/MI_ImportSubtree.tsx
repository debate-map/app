import {BaseComponentPlus} from "react-vextensions";
import {Observer} from "vwebapp-framework";
import {VMenuItem} from "react-vmenu";
import {HasModPermissions} from "Store/firebase/users/$user";
import {MeID} from "Store/firebase/users";
import {styles} from "Utils/UI/GlobalStyles";
import {ShowMessageBox, BoxController} from "react-vmessagebox";
import {Column, Row, TextArea, Button} from "react-vcomponents";
import {FromJSON, ToJSON} from "js-vextensions";
import {ImportSubtree_Old} from "Server/Commands/ImportSubtree_Old";
import {GetParentNodeID, GetNodeID} from "Store/firebase/nodes";
import {MI_SharedProps} from "../NodeUI_Menu";
import {SubtreeExportData_Old} from "./MI_ExportSubtree";
import {AddChildNode} from "Server/Commands/AddChildNode";

@Observer
export class MI_ImportSubtree extends BaseComponentPlus({} as MI_SharedProps, {}) {
	render() {
		const sharedProps = this.props as MI_SharedProps;
		if (!HasModPermissions(MeID())) return null;
		return (
			<VMenuItem text="Import subtree" enabled={HasModPermissions(MeID())} style={styles.vMenuItem} onClick={async e=>{
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

class ImportSubtreeUI extends BaseComponentPlus({} as {controller: BoxController} & MI_SharedProps, {subtreeJSON: "", error: null as string, dbUpdates: null}) {
	importCommand: ImportSubtree_Old;
	render() {
		const {mapID, node, path, controller} = this.props;
		const {subtreeJSON, error, dbUpdates} = this.state;
		return (
			<Column style={{width: 1000}}>
				<Row>
					<Column style={{width: 500}}>
						<Row>Subtree JSON:</Row>
						<TextArea value={subtreeJSON} rows={30} onChange={val=>this.SetState({subtreeJSON: val})}/>
					</Column>
					<Column style={{width: 500}}>
						<Row>DBUpdates:</Row>
						<TextArea value={error ?? ToJSON(dbUpdates, null, 2)} rows={30} editable={false}/>
					</Column>
				</Row>
				<Row mt={5}>
					<Button text="GetDBUpdates" onClick={async()=>{
						this.importCommand = new ImportSubtree_Old({mapID, parentNodeID: GetNodeID(path), subtreeJSON});
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
							this.SetState({error});
							return;
						}

						const dbUpdates = this.importCommand.GetDBUpdates();
						this.SetState({error: null, dbUpdates});
					}}/>
					<Button ml={5} text="ApplyDBUpdates" enabled={dbUpdates?.VKeys().length > 0} onClick={async ()=>{
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
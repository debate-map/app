import {GetAsync} from "mobx-graphlink";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, CheckBox, Text} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {store} from "Store";
import {IsUserCreatorOrMod, MeID, GetNodeL2, AddNodeRevision, SetMapFeatured, UpdateMapDetails, DeleteMap, DMap, GetNodeLinks} from "dm_common";
import {Observer, GetUpdates, InfoButton, RunInAction} from "web-vcore";
import {SLMode} from "UI/@SL/SL.js";
import {Button_SL} from "UI/@SL/SLButton.js";
import {runInAction} from "mobx";
import {FromJSON, ToJSON, E, NN} from "js-vextensions";
import {RunCommand_DeleteMap, RunCommand_UpdateMap} from "Utils/DB/Command.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {MapDetailsUI} from "../../MapDetailsUI.js";

// todo: probably ms this runs in two steps: 1) gets db-updates, 2) user looks over and approves, 3) user presses continue (to apply using ApplyDBUpdates, or a composite command)
/*export async function ApplyNodeDefaults(nodeID: string, nodeDefaults: NodeRevision_Defaultable, recursive: boolean, mapID: string, runInfo = {revisionsUpdated: new Set<string>()}) {
	if (!CanEditNode(MeID(), nodeID)) return;
	const node = await GetAsync(()=>GetNodeL2(nodeID));
	if (runInfo.revisionsUpdated.has(node.currentRevision)) return;

	const oldJSON = ToJSON(node.current);
	const newRevision = E(FromJSON(oldJSON), nodeDefaults);
	const newJSON = ToJSON(newRevision);
	if (newJSON != oldJSON) {
		const updateCommand = new AddNodeRevision({mapID, revision: newRevision});
		await updateCommand.RunOnServer();
		runInfo.revisionsUpdated.add(node.currentRevision);
	}

	if (recursive && node.children) {
		for (const childID of node.children.VKeys()) {
			await	ApplyNodeDefaults(childID, nodeDefaults, true, mapID, runInfo);
		}
		// apply for all children paths in parallel (to be used in future)
		//await	Promise.all(node.children.VKeys().map(childID=>ApplyNodeDefaults(childID, nodeDefaults, true, mapID, runInfo)));
	}

	return runInfo;
}*/

@Observer
export class DetailsDropDown extends BaseComponent<{map: DMap}, {dataError: string}> {
	detailsUI: MapDetailsUI|n;
	// permOptions: PermissionsOptions;
	render() {
		const {map} = this.props;
		const {dataError} = this.state;

		const Button_Final = SLMode ? Button_SL : Button;
		const creatorOrMod = IsUserCreatorOrMod(MeID(), map);

		const setMapFeaturedCommand = new SetMapFeatured({id: map.id, featured: !map.featured}); // kept atm just for permission-checking

		return (
			<DropDown>
				<DropDownTrigger><Button_Final ml={5} style={{height: "100%"}} text="Details"/></DropDownTrigger>
				<DropDownContent style={{zIndex: zIndexes.dropdown, position: "fixed", left: 0, borderRadius: "0 0 5px 0"}}><Column>
					<MapDetailsUI ref={c=>this.detailsUI = c} baseData={map} phase={creatorOrMod ? "edit" : "view"} onChange={newData=>{
						this.SetState({dataError: this.detailsUI!.GetValidationError()});
					}}/>
					{creatorOrMod &&
						<Row>
							<Button mt={5} text="Save" enabled={dataError == null} title={dataError} onLeftClick={async()=>{
								const mapUpdates = GetUpdates(map, this.detailsUI!.GetNewData()).ExcludeKeys("layers", "timelines");
								//await new UpdateMapDetails({id: map.id, updates: mapUpdates}).RunOnServer();
								await RunCommand_UpdateMap({id: map.id, updates: mapUpdates});
							}}/>
						</Row>}
					{creatorOrMod &&
						<Column mt={10}>
							<Row style={{fontWeight: "bold"}}>Advanced:</Row>
							<Row mt={5} center>
								<CheckBox text="Featured"
									enabled={setMapFeaturedCommand.Validate_Safe() == null} title={setMapFeaturedCommand.ValidateErrorStr}
									value={map.featured ?? false} onChange={async val=>{
										//setMapFeaturedCommand.RunOnServer();
										await RunCommand_UpdateMap({id: map.id, updates: {featured: val}});
									}}/>
							</Row>
							<Row center>
								<Text>Actions:</Text>
								{/*<Button ml={5} text="Apply node-defaults" onLeftClick={async()=>{
									ShowMessageBox({
										title: "Recursively apply node-defaults", cancelButton: true,
										message: `
											Recursively apply node-defaults, for nodes within the map "${map.name}"?

											Notes:
											* Recurses down from the root node, modifying non-matching nodes to match the node-defaults; ignores paths where we lack the edit permission.
											* The process may take quite a while (depending on the map size). A message will display on completion.
											* There is no user-interface yet to stop the operation; closing the browser tab will accomplish this, though.
											* You cannot directly undo the operation. (though if the previous node settings were all the same, you could rerun this tool)
										`.AsMultiline(0),
										onOK: async()=>{
											const runInfo = await ApplyNodeDefaults(map.rootNode, map.nodeDefaults, true, map.id);
											ShowMessageBox({title: "Done", message: `
												Finished applying the node-defaults.

												Node update-count: ${runInfo.revisionsUpdated.size}
											`.AsMultiline(0)});
										},
									});
								}}/>
								<InfoButton ml={5} text="Recurses down from the root node, modifying non-matching nodes to match the node-defaults; ignores paths where we lack the edit permission."/>*/}
								<Button ml={5} text="Delete" onLeftClick={async()=>{
									const rootNode = NN(await GetAsync(()=>GetNodeL2(map.rootNode)));
									if (GetNodeLinks(rootNode.id).length != 0) {
										return void ShowMessageBox({
											title: "Still has children",
											message: "Cannot delete this map until all the children of its root-node have been unlinked or deleted.",
										});
									}

									ShowMessageBox({
										title: `Delete "${map.name}"`, cancelButton: true,
										message: `Delete the map "${map.name}"?`,
										onOK: async()=>{
											//await new DeleteMap({id: map.id}).RunOnServer();
											await RunCommand_DeleteMap({id: map.id});
											RunInAction("DeleteMap.onDone", ()=>store.main.debates.selectedMapID = null);
										},
									});
								}}/>
							</Row>
						</Column>}
				</Column></DropDownContent>
			</DropDown>
		);
	}
}
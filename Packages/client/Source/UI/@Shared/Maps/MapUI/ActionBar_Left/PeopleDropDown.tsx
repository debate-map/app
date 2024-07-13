import {CloneWithPrototypes} from "js-vextensions";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Text, TextInput, Pre} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {SLMode} from "UI/@SL/SL.js";
import {Button_SL} from "UI/@SL/SLButton.js";
import {InfoButton, RunInAction_Set, Observer} from "web-vcore";
import {GetMapEditors, IsUserCreatorOrMod, MeID, UpdateMapDetails, Map} from "dm_common";
import {UserPicker} from "UI/@Shared/Users/UserPicker.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_UpdateMap} from "Utils/DB/Command";
import {zIndexes} from "Utils/UI/ZIndexes.js";

export const userIDPlaceholder = "[user-id placeholder]";

@Observer
export class PeopleDropDown extends BaseComponent<{map: Map}, {}> {
	render() {
		const {map} = this.props;
		//const editors = GetMapEditors(map.id).filter(a=>a);
		const editors = GetMapEditors(map.id);

		const Button_Final = SLMode ? Button_SL : Button;
		const creatorOrMod = IsUserCreatorOrMod(MeID(), map);
		return (
			<DropDown>
				<DropDownTrigger><Button_Final ml={5} style={{height: "100%"}} text="People"/></DropDownTrigger>
				<DropDownContent style={{zIndex: zIndexes.dropdown, position: "fixed", left: 0, width: 500, borderRadius: "0 0 5px 0"}} content={()=>(
					<Column>
						<Row center style={{justifyContent: "center"}}>
							<Text style={{color: "red", fontSize: 13}}>{`Note: Actual access/edit permissions are set by nodes' access-policies.`}</Text>
							<InfoButton ml={5} text={`
								The map's "list of editors" is a legacy feature that has no "actual function" atm (other than for reference), though functionality will be added here in the future.
								Note: You can set the "default access-policy" for new nodes in the map's Details panel.
							`.AsMultiline(0)}/>
						</Row>
						<Row mt={5} center>
							<Text>Editors:</Text>
							{creatorOrMod &&
							<Button ml="auto" text="Add editor" onClick={async()=>{
								const newEditors = CloneWithPrototypes(map.editors || []);
								newEditors.push(userIDPlaceholder);
								//new UpdateMapDetails({id: map.id, updates: {editors: newEditors}}).RunOnServer();
								await RunCommand_UpdateMap({id: map.id, updates: {editors: newEditors}});
							}}/>}
						</Row>
						{map.editors.map((editorID, index)=>{
							const editor = editors[index];
							const displayName = editor?.displayName ?? "n/a";
							return (
								<Row key={index} mt={5}>
									<UserPicker value={editorID} onChange={async val=>{
										const newEditors = CloneWithPrototypes(map.editors);
										newEditors[index] = val;
										//new UpdateMapDetails({id: map.id, updates: {editors: newEditors}}).RunOnServer();
										await RunCommand_UpdateMap({id: map.id, updates: {editors: newEditors}});
									}}>
										<Button enabled={creatorOrMod} text={editorID != userIDPlaceholder ? `${displayName} (id: ${editorID})` : "(click to select user)"} style={{width: "100%"}}/>
									</UserPicker>
									{creatorOrMod &&
									<Button ml={5} text="X" style={{...liveSkin.Style_XButton()}} onClick={()=>{
										ShowMessageBox({
											title: `Remove editor "${displayName}"`, cancelButton: true,
											message: `Remove editor "${displayName}" (id: ${editorID})?`,
											onOK: async()=>{
												const newEditors = CloneWithPrototypes(map.editors);
												newEditors.RemoveAt(index);
												//new UpdateMapDetails({id: map.id, updates: {editors: newEditors}}).RunOnServer();
												await RunCommand_UpdateMap({id: map.id, updates: {editors: newEditors}});
											},
										});
									}}/>}
								</Row>
							);
						})}
					</Column>
				)}/>
			</DropDown>
		);
	}
}
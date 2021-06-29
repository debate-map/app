import {CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Text, TextInput, Pre} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {Button_GAD} from "UI/@GAD/GADButton.js";
import {InfoButton, RunInAction_Set, Observer} from "web-vcore";
import {GetMapEditorIDs, GetMapEditors} from "dm_common";
import {IsUserCreatorOrMod} from "dm_common";
import {MeID} from "dm_common";
import {UpdateMapDetails} from "dm_common";
import {Map} from "dm_common";
import {UserPicker} from "UI/@Shared/Users/UserPicker.js";

const userIDPlaceholder = "[user-id placeholder]";

@Observer
export class PeopleDropDown extends BaseComponent<{map: Map}, {}> {
	render() {
		const {map} = this.props;
		// const editors = GetMapEditors(map.id).filter((a) => a);
		const editorIDs = GetMapEditorIDs(map.id);
		const editors = GetMapEditors(map.id);

		const Button_Final = GADDemo ? Button_GAD : Button;
		const creatorOrMod = IsUserCreatorOrMod(MeID(), map);
		return (
			<DropDown>
				<DropDownTrigger><Button_Final ml={5} style={{height: "100%"}} text="People"/></DropDownTrigger>
				<DropDownContent style={{left: 0, width: 500, borderRadius: "0 0 5px 0"}}><Column>
					<Row center>
						<Text>Editors:</Text>
						<InfoButton ml={5} text="Editors have extended permissions, like being able to contribute anywhere in the map. (use node permissions to restrict other users)"/>
						{creatorOrMod &&
						<Button ml="auto" text="Add editor" onClick={()=>{
							const newEditors = CloneWithPrototypes(map.editors || []);
							newEditors.push(userIDPlaceholder);
							new UpdateMapDetails({id: map.id, updates: {editors: newEditors}}).Run();
						}}/>}
					</Row>
					{editorIDs.map((editorID, index)=>{
						const editor = editors[index];
						const displayName = editor?.displayName ?? "n/a";
						return (
							<Row key={index} mt={5}>
								<UserPicker value={editorID} onChange={val=> {
									const newEditors = CloneWithPrototypes(map.editors);
									newEditors[index] = val;
									new UpdateMapDetails({id: map.id, updates: {editors: newEditors}}).Run();
								}}>
									<Button enabled={creatorOrMod} text={editorID != userIDPlaceholder ? `${displayName} (id: ${editorID})` : "(click to select user)"} style={{width: "100%"}}/>
								</UserPicker>
								{creatorOrMod &&
								<Button ml={5} text="X" onClick={()=>{
									ShowMessageBox({
										title: `Remove editor "${displayName}"`, cancelButton: true,
										message: `Remove editor "${displayName}" (id: ${editorID})?`,
										onOK: ()=>{
											const newEditors = CloneWithPrototypes(map.editors);
											newEditors.RemoveAt(index);
											new UpdateMapDetails({id: map.id, updates: {editors: newEditors}}).Run();
										},
									});
								}}/>}
							</Row>
						);
					})}
				</Column></DropDownContent>
			</DropDown>
		);
	}
}
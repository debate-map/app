import {CloneWithPrototypes} from "js-vextensions";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Text, TextInput} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {GADDemo} from "Source/UI/@GAD/GAD";
import {Button_GAD} from "Source/UI/@GAD/GADButton";
import {InfoButton} from "vwebapp-framework";
import {GetMapEditorIDs, GetMapEditors} from "Subrepos/Server/Source/@Shared/Store/firebase/maps/$map";
import {IsUserCreatorOrMod} from "Subrepos/Server/Source/@Shared/Store/firebase/users/$user";
import {MeID} from "Subrepos/Server/Source/@Shared/Store/firebase/users";
import {UpdateMapDetails} from "Subrepos/Server/Source/@Shared/Commands/UpdateMapDetails";
import {Map} from "Subrepos/Server/Source/@Shared/Store/firebase/maps/@Map";

export class PeopleDropDown extends BaseComponent<{map: Map}, {}> {
	render() {
		const {map} = this.props;
		// const editors = GetMapEditors(map._key).filter((a) => a);
		const editorIDs = GetMapEditorIDs(map._key);
		const editors = GetMapEditors(map._key);

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
							const newEditors = CloneWithPrototypes(map.editorIDs || []);
							newEditors.push("(enter user-id here)");
							new UpdateMapDetails({id: map._key, updates: {editorIDs: newEditors}}).Run();
						}}/>}
					</Row>
					{editorIDs.map((editorID, index)=>{
						const editor = editors[index];
						const displayName = editor?.displayName ?? "n/a";
						return (
							<Row key={index} mt={5}>
								<TextInput delayChangeTillDefocus={true} style={{width: 250}} editable={creatorOrMod} value={editorID} onChange={val=>{
									const newEditors = CloneWithPrototypes(map.editorIDs);
									newEditors[index] = val;
									new UpdateMapDetails({id: map._key, updates: {editorIDs: newEditors}}).Run();
								}}/>
								<Text ml={5}>({displayName})</Text>
								{creatorOrMod &&
								<Button ml="auto" text="X" onClick={()=>{
									ShowMessageBox({
										title: `Remove editor "${displayName}"`, cancelButton: true,
										message: `Remove editor "${displayName}" (id: ${editorID})?`,
										onOK: ()=>{
											const newEditors = CloneWithPrototypes(map.editorIDs);
											newEditors.RemoveAt(index);
											new UpdateMapDetails({id: map._key, updates: {editorIDs: newEditors}}).Run();
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
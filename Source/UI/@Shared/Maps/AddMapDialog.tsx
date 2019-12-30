import {OMIT} from "js-vextensions";
import {Column, Row} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {AddMap} from "../../../Server/Commands/AddMap";
import {Map, MapType} from "../../../Store/firebase/maps/@Map";
import {MeID} from "../../../Store/firebase/users";
import {MapDetailsUI} from "./MapDetailsUI";

export function ShowAddMapDialog(userID: string, type: MapType) {
	let newMap = new Map({
		name: "",
		type,
		creator: MeID(),
		editorIDs: type == MapType.Private ? [MeID()] : OMIT as any,
	});

	let error = null;
	const Change = (..._)=>boxController.UpdateUI();
	let boxController = ShowMessageBox({
		title: "Add map", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<MapDetailsUI baseData={newMap} forNew={true} onChange={(val, ui)=>Change(newMap = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=>{
			new AddMap({map: newMap}).Run();
		},
	});
}
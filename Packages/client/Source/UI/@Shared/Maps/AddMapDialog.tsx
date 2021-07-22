import {AddMap, Map, MeID} from "dm_common";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {MapDetailsUI} from "./MapDetailsUI.js";

export function ShowAddMapDialog() {
	let newMap = new Map({
		name: "",
		editors: [MeID.NN()],
	});

	let error = null;
	const Change = (..._)=>boxController.UpdateUI();
	const boxController = ShowMessageBox({
		title: "Add map", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonProps = {enabled: error == null};
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<MapDetailsUI baseData={newMap} phase="create" onChange={(val, _, ui)=>Change(newMap = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=>{
			new AddMap({map: newMap}).RunOnServer();
		},
	});
}
import {OMIT} from "web-vcore/nm/js-vextensions";
import {Column, Row} from "web-vcore/nm/react-vcomponents";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {MapType, Map} from "dm_common";
import {MeID} from "dm_common";
import {AddMap} from "dm_common";
import {MapDetailsUI} from "./MapDetailsUI";

export function ShowAddMapDialog(userID: string) {
	const type = MapType.public as MapType; // hard-coded for now
	let newMap = new Map({
		name: "",
		type,
		creator: MeID(),
		editors: type == MapType.private ? [MeID()] : OMIT as any,
	});

	let error = null;
	const Change = (..._)=>boxController.UpdateUI();
	let boxController = ShowMessageBox({
		title: "Add map", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonProps = {enabled: error == null};
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
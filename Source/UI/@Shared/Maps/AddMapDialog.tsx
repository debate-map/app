import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import AddTerm from "../../../Server/Commands/AddTerm";
import {Map, MapType} from "../../../Store/firebase/maps/@Map";
import AddMap from "../../../Server/Commands/AddMap";
import MapDetailsUI from "./MapDetailsUI";

export function ShowAddMapDialog(userID: string, type: MapType) {
	let newMap = new Map({
		name: "",
		type,
		creator: GetUserID(),
	});
	
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add map`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<MapDetailsUI baseData={newMap} forNew={true} onChange={(val, ui)=>Change(newMap = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=> {
			new AddMap({map: newMap}).Run();
		}
	});
}
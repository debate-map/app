import {GetUser, GetUserID} from "../../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Term, TermType} from "../../../../Store/firebase/terms/@Term";
import AddTerm from "../../../../Server/Commands/AddTerm";
import {Map, MapType} from "../../../../Store/firebase/maps/@Map";
import AddMap from "../../../../Server/Commands/AddMap";
import MapDetailsUI from "./../MapDetailsUI";
import {Layer} from "Store/firebase/layers/@Layer";
import LayerDetailsUI from "../LayerDetailsUI";
import AddLayer from "../../../../Server/Commands/AddLayer";

export function ShowAddLayerDialog(userID: string) {
	let newLayer = new Layer({
		name: "",
		creator: GetUserID(),
	});
	
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add layer`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<LayerDetailsUI baseData={newLayer} forNew={true} onChange={(val, ui)=>Change(newLayer = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=> {
			new AddLayer({layer: newLayer}).Run();
		}
	});
}
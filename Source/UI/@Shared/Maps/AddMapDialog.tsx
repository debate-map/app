import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import {Pre, GetInnerComp} from "../../../Frame/UI/ReactGlobals";
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
	
	let detailsUI: MapDetailsUI;
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add map`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<MapDetailsUI ref={c=>detailsUI = GetInnerComp(c) as any} baseData={newMap} forNew={true}
						onChange={val=>Change(newMap = val, error = detailsUI.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=> {
			new AddMap({map: newMap}).Run();
		}
	});
}
import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import TermDetailsUI from "./TermDetailsUI";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import AddTerm from "../../../Server/Commands/AddTerm";
import TermComponent from "../../../Store/firebase/termComponents/@TermComponent";
import AddTermComponent from "../../../Server/Commands/AddTermComponent";
import {TermComponentUI} from "../../../UI/Content/Terms/TermComponentsUI";

export function ShowAddTermComponentDialog(userID: string, termID: number) {
	let firebase = store.firebase.helpers;

	let info = {text: ""};
	
	let justShowed = true;
	let Change = _=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add term component`, cancelButton: true,
		messageUI: ()=> {
			setTimeout(()=>justShowed = false);
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<TermComponentUI first={true} termComponent={info as TermComponent} creating={true} onChange={val=>Change(info = val)}/>
				</Column>
			);
		},
		onOK: ()=> {
			let newTermComponent = new TermComponent({
				text: info.text,
				//creator: GetUserID(),
			});

			new AddTermComponent({termID: termID, termComponent: newTermComponent}).Run();
		}
	});
}
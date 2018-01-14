import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import TermDetailsUI from "./TermDetailsUI";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import AddTerm from "../../../Server/Commands/AddTerm";

export function ShowAddTermDialog(userID: string) {
	let firebase = store.firebase.helpers;

	let newTerm = new Term({
		name: "",
		type: TermType.SpecificEntity,
		shortDescription_current: "",
		creator: GetUserID(),
	});
	
	let valid = false;
	let boxController: BoxController = ShowMessageBox({
		title: `Add term`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = valid;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<TermDetailsUI baseData={newTerm} forNew={true}
						onChange={(val, error)=> {
							newTerm = val;
							valid = !error;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		},
		onOK: ()=> {
			/*let newTerm = new Term({
				name: info.name,
				type: info.type,
				shortDescription_current: info.shortDescription_current,
				creator: GetUserID(),
			});*/
			//newTerm = newTerm.Including("name", "type", "person", "shortDescription_current", "creator", "createdAt") as Term;
			new AddTerm({term: newTerm}).Run();
		}
	});
}
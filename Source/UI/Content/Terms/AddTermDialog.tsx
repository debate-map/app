import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import {Pre} from "../../../Frame/UI/ReactGlobals";
import TermDetailsUI from "./TermDetailsUI";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import AddTerm from "../../../Server/Commands/AddTerm";

export function ShowAddTermDialog(userID: string) {
	let firebase = store.firebase.helpers;

	let info = {
		name: "",
		type: TermType.SpecificEntity,
		shortDescription_current: "",
	};
	
	let justShowed = true;
	let Change = _=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add term`, cancelButton: true,
		messageUI: ()=> {
			setTimeout(()=>justShowed = false);
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<TermDetailsUI baseData={info as Term} creating={true} onChange={val=>Change(info = val)}/>
				</Column>
			);
		},
		onOK: ()=> {
			let newTerm = new Term({
				name: info.name,
				type: info.type,
				shortDescription_current: info.shortDescription_current,
				creator: GetUserID(),
			});

			new AddTerm({term: newTerm}).Run();
		}
	});
}
import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import {Pre, GetInnerComp} from "../../../Frame/UI/ReactGlobals";
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
	
	let justShowed = true;
	let detailsUI: TermDetailsUI;
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add term`, cancelButton: true,
		messageUI: ()=> {
			setTimeout(()=>justShowed = false);
			/*setTimeout(()=> {
				if (justShowed) {
					justShowed = false;
					Change(error = detailsUI.GetValidationError()); // call this once, for initial validation
				}
			});*/
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<TermDetailsUI ref={c=>detailsUI = GetInnerComp(c) as any} baseData={newTerm} creating={true}
						onChange={val=>Change(newTerm = val, error = detailsUI.GetValidationError())}/>
					<Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>
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
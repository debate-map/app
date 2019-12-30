import {Column} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {store} from "Store";
import {AddTermComponent} from "../../../Server/Commands/AddTermComponent";
import {TermComponent} from "../../../Store/firebase/termComponents/@TermComponent";
import {TermComponentUI} from "./TermComponentsUI";

export function ShowAddTermComponentDialog(userID: string, termID: string) {
	let info = {text: ""};

	let justShowed = true;
	const Change = _=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: "Add term component", cancelButton: true,
		message: ()=>{
			setTimeout(()=>justShowed = false);
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<TermComponentUI first={true} termComponent={info as TermComponent} creating={true} onChange={val=>Change(info = val)}/>
				</Column>
			);
		},
		onOK: ()=>{
			const newTermComponent = new TermComponent({
				text: info.text,
				// creator: MeID(),
			});

			new AddTermComponent({termID, termComponent: newTermComponent}).Run();
		},
	});
}
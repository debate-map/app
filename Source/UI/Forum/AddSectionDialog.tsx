import {GetUser, GetUserID} from "../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Term, TermType} from "../../Store/firebase/terms/@Term";
import AddTerm from "../../Server/Commands/AddTerm";
import {Map, MapType} from "../../Store/firebase/maps/@Map";
import AddMap from "../../Server/Commands/AddMap";
import ThreadDetailsUI from "./Thread/ThreadDetailsUI";
import {Thread} from "../../Store/firebase/forum/@Thread";
import AddThread from "../../Server/Commands/AddThread";
import {Post} from "Store/firebase/forum/@Post";
import {Section} from "Store/firebase/forum/@Section";
import SectionDetailsUI from "./SectionDetailsUI";
import AddSection from "../../Server/Commands/AddSection";

export function ShowAddSectionDialog(userID: string) {
	let newSection = new Section({
		name: "",
	});
	
	let detailsUI: SectionDetailsUI;
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add section`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<SectionDetailsUI ref={c=>detailsUI = GetInnerComp(c) as any} baseData={newSection} forNew={true}
						onChange={val=>Change(newSection = val, error = detailsUI.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=> {
			new AddSection({section: newSection}).Run();
		}
	});
}
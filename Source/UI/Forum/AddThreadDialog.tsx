import {GetUser, GetUserID} from "../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "../../Frame/UI/VMessageBox";
import Column from "../../Frame/ReactComponents/Column";
import Row from "../../Frame/ReactComponents/Row";
import TextInput from "../../Frame/ReactComponents/TextInput";
import {Pre, GetInnerComp} from "../../Frame/UI/ReactGlobals";
import {Term, TermType} from "../../Store/firebase/terms/@Term";
import AddTerm from "../../Server/Commands/AddTerm";
import {Map, MapType} from "../../Store/firebase/maps/@Map";
import AddMap from "../../Server/Commands/AddMap";
import ThreadDetailsUI from "./ThreadDetailsUI";
import {Thread} from "../../Store/firebase/forum/@Thread";
import AddThread from "../../Server/Commands/AddThread";
import {Post} from "Store/firebase/forum/@Post";

export function ShowAddThreadDialog(userID: string, subforumID: number) {
	let newThread = new Thread({
		title: "",
		creator: GetUserID(),
		subforum: subforumID,
	});
	let newPost = new Post({
		text: "Test",
		creator: GetUserID(),
	});
	
	let detailsUI: ThreadDetailsUI;
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add thread`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<ThreadDetailsUI ref={c=>detailsUI = GetInnerComp(c) as any} baseData={newThread} forNew={true}
						onChange={val=>Change(newThread = val, error = detailsUI.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=> {
			new AddThread({thread: newThread, post: newPost}).Run();
		}
	});
}
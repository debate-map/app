import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import AddTerm from "../../../Server/Commands/AddTerm";
import ImageDetailsUI from "./ImageDetailsUI";
import AddImage from "../../../Server/Commands/AddImage";
import {Image, ImageType} from "../../../Store/firebase/images/@Image";

export function ShowAddImageDialog(userID: string) {
	let firebase = store.firebase.helpers;

	let newImage = new Image({
		name: "",
		type: ImageType.Photo,
		description: "",
		creator: GetUserID(),
	});
	
	let justShowed = true;
	let detailsUI: ImageDetailsUI;
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add image`, cancelButton: true,
		messageUI: ()=> {
			//setTimeout(()=>justShowed = false);
			setTimeout(()=> {
				if (justShowed) {
					justShowed = false;
					Change(error = detailsUI.GetValidationError()); // call this once, for initial validation
				}
			});
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<ImageDetailsUI ref={c=>detailsUI = GetInnerComp(c) as any} baseData={newImage} creating={true} editing={false}
						onChange={val=>Change(newImage = val, error = detailsUI.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=> {
			new AddImage({image: newImage}).Run();
		}
	});
}
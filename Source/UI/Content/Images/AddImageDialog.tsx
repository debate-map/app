import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
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
	
	let valid = false;
	let boxController: BoxController = ShowMessageBox({
		title: `Add image`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = valid;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<ImageDetailsUI baseData={newImage} creating={true} editing={false}
						onChange={(val, error)=> {
							newImage = val;
							valid = !error;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		},
		onOK: ()=> {
			new AddImage({image: newImage}).Run();
		}
	});
}
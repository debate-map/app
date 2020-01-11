import {Column} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {store} from "Store";
import {AddImage} from "../../../Server/Commands/AddImage";
import {Image, ImageType} from "../../../Store/firebase/images/@Image";
import {MeID} from "../../../Store/firebase/users";
import {ImageDetailsUI} from "./ImageDetailsUI";

export function ShowAddImageDialog(userID: string) {
	let newImage = new Image({
		name: "",
		type: ImageType.Photo,
		description: "",
		creator: MeID(),
	});

	let valid = false;
	const boxController: BoxController = ShowMessageBox({
		title: "Add image", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonProps = {enabled: valid};
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<ImageDetailsUI baseData={newImage} creating={true} editing={false}
						onChange={(val, error)=>{
							newImage = val;
							valid = !error;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		},
		onOK: ()=>{
			new AddImage({image: newImage}).Run();
		},
	});
}
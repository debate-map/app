import {E} from "js-vextensions";
import {Column} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {AddImage} from "../../../Server/Commands/AddImage";
import {Image, ImageType} from "../../../Store/firebase/images/@Image";
import {ImageDetailsUI} from "./ImageDetailsUI";

export function ShowAddImageDialog(initialData?: Partial<Image>, postAdd?: (id: string)=>void) {
	let newImage = new Image(E({
		name: "",
		type: ImageType.Photo,
		description: "",
	}, initialData));

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
		onOK: async()=>{
			const id = await new AddImage({image: newImage}).Run();
			if (postAdd) postAdd(id);
		},
	});
}
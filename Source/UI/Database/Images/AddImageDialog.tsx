import {E} from "js-vextensions";
import {Column} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {observer} from "mobx-react";
import {observer_simple} from "vwebapp-framework";
import {AddImage} from "Subrepos/Server/Source/@Shared/Commands/AddImage";
import {ImageType, Image} from "Subrepos/Server/Source/@Shared/Store/firebase/images/@Image";
import {ImageDetailsUI} from "./ImageDetailsUI";

export function ShowAddImageDialog(initialData?: Partial<Image>, postAdd?: (id: string)=>void) {
	let newImage = new Image(E({
		name: "",
		type: ImageType.Photo,
		description: "",
	}, initialData));
	const getCommand = ()=>new AddImage({image: newImage});

	const boxController: BoxController = ShowMessageBox({
		title: "Add image", cancelButton: true,
		message: observer_simple(()=>{
			const tempCommand = getCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.validateError,
			};

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<ImageDetailsUI baseData={newImage} creating={true} editing={false}
						onChange={(val, error)=>{
							newImage = val;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		}),
		onOK: async()=>{
			const id = await getCommand().Run();
			if (postAdd) postAdd(id);
		},
	});
}
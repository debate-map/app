import {E} from "js-vextensions";
import {Column} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {observer} from "mobx-react";
import {observer_simple} from "vwebapp-framework";
import {AddMedia, MediaType, Media} from "@debate-map/server-link/Source/Link";
import {MediaDetailsUI} from "./MediaDetailsUI";

export function ShowAddMediaDialog(initialData?: Partial<Media>, postAdd?: (id: string)=>void) {
	let newMedia = new Media(E({
		name: "",
		type: MediaType.Image,
		description: "",
	}, initialData));
	const getCommand = ()=>new AddMedia({media: newMedia});

	const boxController: BoxController = ShowMessageBox({
		title: "Add media", cancelButton: true,
		message: observer_simple(()=>{
			const tempCommand = getCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.validateError,
			};

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<MediaDetailsUI baseData={newMedia} creating={true} editing={false}
						onChange={(val, error)=>{
							newMedia = val;
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
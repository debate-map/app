import {E} from "web-vcore/nm/js-vextensions.js";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {observer_simple} from "web-vcore";
import {AddMedia, MediaType, Media} from "dm_common";
import {MediaDetailsUI} from "./MediaDetailsUI.js";

export function ShowAddMediaDialog(initialData?: Partial<Media>, postAdd?: (id: string)=>void) {
	let newMedia = new Media(E({
		name: "",
		type: MediaType.image,
		description: "",
	}, initialData));
	const getCommand = ()=>new AddMedia({media: newMedia});

	const boxController: BoxController = ShowMessageBox({
		title: "Add media", cancelButton: true,
		message: observer_simple(()=>{
			const tempCommand = getCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.ValidateErrorStr,
			};

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<MediaDetailsUI baseData={newMedia} phase="create"
						onChange={(val, error)=>{
							newMedia = val;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		}),
		onOK: async()=>{
			const {id} = await getCommand().RunOnServer();
			if (postAdd) postAdd(id);
		},
	});
}
import {AccessPolicy, AddAccessPolicy} from "dm_common";
import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI.js";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base";
import {observer_simple} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {Column, RowLR, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

export class PolicyDetailsUI extends DetailsUI_Base<AccessPolicy, PolicyDetailsUI> {
	render() {
		const {baseData, style, onChange} = this.props;
		const {newData} = this.state;
		const {Change, creating, enabled} = this.helpers;

		const splitAt = 140, width = 400;
		return (
			<Column style={style}>
				{!creating &&
					<IDAndCreationInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Text>Name:</Text>
					<TextInput required enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
			</Column>
		);
	}
}

export function ShowAddAccessPolicyDialog(initialData?: Partial<AccessPolicy>, postAdd?: (id: string)=>void) {
	let newEntry = new AccessPolicy(E({
		name: "",
	}, initialData));
	const getCommand = ()=>new AddAccessPolicy({policy: newEntry});

	const boxController: BoxController = ShowMessageBox({
		title: "Add access-policy", cancelButton: true,
		message: observer_simple(()=>{
			const tempCommand = getCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.validateError,
			};

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<PolicyDetailsUI baseData={newEntry} phase="create"
						onChange={(val, error)=>{
							newEntry = val;
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
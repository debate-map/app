import {AccessPolicy, AddAccessPolicy, GetUser, PermissionSet} from "dm_common";
import React from "react";
import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI.js";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base";
import {userIDPlaceholder} from "UI/@Shared/Maps/MapUI/ActionBar_Left/PeopleDropDown";
import {UserPicker} from "UI/@Shared/Users/UserPicker";
import {styles} from "Utils/UI/GlobalStyles";
import {Observer, observer_simple} from "web-vcore";
import {Clone, E} from "web-vcore/nm/js-vextensions.js";
import {Button, CheckBox, Column, Row, RowLR, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

@Observer
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
				<RowLR mt={5} splitAt={splitAt}>
					<Text>Base permissions:</Text>
					<PermissionSetEditor enabled={enabled} value={newData.permissions_base} onChange={val=>Change(newData.permissions_base = val)}/>
				</RowLR>
				<Row mt={5}>
					<Text>User overrides:</Text>
					<Button ml={5} enabled={enabled} text="Add" onClick={()=>{
						newData.permissions_userExtends["NEW_USER_ID"] = new PermissionSet();
						Change();
					}}/>
				</Row>
				{Object.entries(newData.permissions_userExtends).map(entry=>{
					const [userID, permissions] = entry;
					const userDisplayName = GetUser(userID)?.displayName;
					return (
						<Row key={userID}>
							{/*<TextInput mr={5} enabled={enabled} style={{}} value={userID} onChange={val=>{
								delete newData.permissions_userExtends[userID];
								newData.permissions_userExtends[val] = permissions;
								Change();
							}}/>*/}
							<UserPicker value={userID} onChange={val=>{
								delete newData.permissions_userExtends[userID];
								newData.permissions_userExtends[val] = permissions;
								Change();
							}}>
								<Button mr={5} style={{width: "calc(100% - 5px)"}} enabled={enabled} text={userID != userIDPlaceholder ? `${userDisplayName} (id: ${userID})` : "(click to select user)"}/>
							</UserPicker>
							<PermissionSetEditor enabled={enabled} value={permissions} onChange={val=>Change(newData.permissions_userExtends[userID] = val)}/>
							<Button ml={5} enabled={enabled} text="X" {...styles.xButton} onClick={()=>{
								delete newData.permissions_userExtends[userID];
								Change();
							}}/>
						</Row>
					);
				})}
			</Column>
		);
	}
}

class PermissionSetEditor extends BaseComponent<{enabled: boolean, value: PermissionSet, onChange: (val: PermissionSet)=>any}, {}> {
	render() {
		const {enabled, value, onChange} = this.props;
		const Change = (setter: (newVal: PermissionSet)=>any)=>{
			const newVal = Clone(value);
			setter(newVal);
			onChange(newVal);
		};
		return (
			<Row>
				<CheckBox enabled={enabled} text="access" value={value.access} onChange={val=>Change(a=>a.access = val)}/>
				<CheckBox ml={10} enabled={enabled} text="add revisions" value={value.addRevisions} onChange={val=>Change(a=>a.addRevisions = val)}/>
				<CheckBox ml={10} enabled={enabled} text="vote" value={value.vote} onChange={val=>Change(a=>a.vote = val)}/>
				<CheckBox ml={10} enabled={enabled} text="delete" value={value.delete} onChange={val=>Change(a=>a.delete = val)}/>
			</Row>
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
				title: tempCommand.ValidateErrorStr,
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
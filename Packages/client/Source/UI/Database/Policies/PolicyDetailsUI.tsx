import {AccessPolicy, AddAccessPolicy, GetAccessPolicy, GetUser, PermissionSet, PermissionSetForType, PermitCriteria, UpdateAccessPolicy} from "dm_common";
import React from "react";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI.js";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base";
import {userIDPlaceholder} from "UI/@Shared/Maps/MapUI/ActionBar_Left/PeopleDropDown";
import {UserPicker} from "UI/@Shared/Users/UserPicker";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {InfoButton, Observer, observer_simple, TextPlus} from "web-vcore";
import {Clone, E} from "web-vcore/nm/js-vextensions.js";
import {Button, CheckBox, Column, Row, RowLR, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {PolicyPicker} from "./PolicyPicker.js";

@Observer
export class PolicyDetailsUI extends DetailsUI_Base<AccessPolicy, PolicyDetailsUI> {
	render() {
		const {baseData, style, onChange} = this.props;
		const {newData} = this.state;
		const {Change, creating, enabled} = this.helpers;
		//const basePolicy = GetAccessPolicy(newData.base);

		const splitAt = 140, width = 400;
		return (
			<Column style={style}>
				{!creating &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Text>Name:</Text>
					<TextInput required enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				{/*<RowLR mt={5} splitAt={splitAt}>
					<TextPlus info="If set, fields left empty in this policy's permissions (shown as dash), are replaced with the value from the base-policy.">Permissions:</TextPlus>
					<PolicyPicker value={newData.base} onChange={val=>{
						new UpdateAccessPolicy({id: baseData.id, updates: {base: val}}).RunOnServer();
					}}>
						<Button enabled={enabled} text={basePolicy ? `${basePolicy.id} (id: ${basePolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>*/}
				<Row center>
					<Text>Permissions:</Text>
					<InfoButton ml={5} text={`
						These are the permissions that are granted to all visitors. (for mere viewing/access, this includes those not signed in)
						
						Note that there are a few additional permission-grants:
						* The creator of an entry can always access an entry (and currently, modify it), so long as they still have basic permissions.
						* Admins can always access and modify any entry.
						* Moderators can modify any entry *that they have access to*. (ie. if something is made accessible/visible to the general public, then mods can modify it)
					`.AsMultiline(0)}/>
				</Row>
				<PermissionSetEditor enabled={enabled} value={newData.permissions} onChange={val=>Change(newData.permissions = val)}/>
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
						<Row mt={5} key={userID}>
							{/*<TextInput mr={5} enabled={enabled} style={{}} value={userID} onChange={val=>{
								delete newData.permissions_userExtends[userID];
								newData.permissions_userExtends[val] = permissions;
								Change();
							}}/>*/}
							<Column>
								<UserPicker value={userID} onChange={val=>{
									delete newData.permissions_userExtends[userID];
									newData.permissions_userExtends[val] = permissions;
									Change();
								}}>
									<Button mr={5} style={{width: "calc(100% - 5px)"}} enabled={enabled} text={userID != userIDPlaceholder ? `${userDisplayName} (id: ${userID})` : "(click to select user)"}/>
								</UserPicker>
								<PermissionSetEditor enabled={enabled} value={permissions} onChange={val=>Change(newData.permissions_userExtends[userID] = val)}/>
							</Column>
							<Button ml={5} enabled={enabled} text="X" style={{...liveSkin.Style_XButton()}} onClick={()=>{
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

		const splitAt = 100;
		return (
			<Column pl={10}>
				<RowLR mt={5} splitAt={splitAt}>
					<Text>Terms:</Text>
					<PermissionSetForTypeEditor enabled={enabled} collection="terms" value={value.terms} onChange={val=>Change(a=>a.terms = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Text>Medias:</Text>
					<PermissionSetForTypeEditor enabled={enabled} collection="medias" value={value.medias} onChange={val=>Change(a=>a.medias = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Text>Maps:</Text>
					<PermissionSetForTypeEditor enabled={enabled} collection="maps" value={value.maps} onChange={val=>Change(a=>a.maps = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Text>Nodes:</Text>
					<PermissionSetForTypeEditor enabled={enabled} collection="nodes" value={value.nodes} onChange={val=>Change(a=>a.nodes = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Text>Node ratings:</Text>
					<PermissionSetForTypeEditor enabled={enabled} collection="nodeRatings" value={value.nodeRatings} onChange={val=>Change(a=>a.nodeRatings = val)}/>
				</RowLR>
			</Column>
		);
	}
}

class PermissionSetForTypeEditor extends BaseComponent<{enabled: boolean, collection: string, value: PermissionSetForType, onChange: (val: PermissionSetForType)=>any}, {}> {
	render() {
		const {enabled, collection, value, onChange} = this.props;
		const Change = (setter: (newVal: PermissionSetForType)=>any)=>{
			const newVal = Clone(value);
			setter(newVal);
			onChange(newVal);
		};
		/*function PermitCriteriaToCheckBoxVal(criteria: PermitCriteria|n) {
			return criteria?.minApprovals == 0 ? true :
				criteria?.minApprovals == -1 ? false :
				"partial";
		}
		function CheckBoxValToPermitCriteria(val: boolean | "partial") {
			return val == true ? {minApprovals: 0, minApprovalPercent: 0} :
				val == false ? {minApprovals: -1, minApprovalPercent: -1} :
				undefined;
		}*/
		const PermitCriteriaToCheckBoxVal = (criteria: PermitCriteria)=>criteria.minApprovals == 0;
		const CheckBoxValToPermitCriteria = (val: boolean)=>new PermitCriteria({minApprovals: val ? 0 : -1, minApprovalPercent: val ? 0 : -1});

		// todo: make this UI support the full set of PermitCriteria values (once there is reputation data for it to actually be compared against)
		return (
			<Row>
				<CheckBox enabled={enabled} text="access" value={value.access ?? "partial"} onChange={val=>Change(a=>a.access = val)}/>
				{collection != "nodeRatings" &&
				<CheckBox ml={10} enabled={enabled} text="modify" value={PermitCriteriaToCheckBoxVal(value.modify)} onChange={val=>Change(a=>a.modify = CheckBoxValToPermitCriteria(val))}/>}
				{collection != "nodeRatings" &&
				<CheckBox ml={10} enabled={enabled} text="delete" value={PermitCriteriaToCheckBoxVal(value.delete)} onChange={val=>Change(a=>a.delete = CheckBoxValToPermitCriteria(val))}/>}
				{collection == "nodes" &&
				<CheckBox ml={10} enabled={enabled} text="vote" value={PermitCriteriaToCheckBoxVal(value.vote)} onChange={val=>Change(a=>a.vote = CheckBoxValToPermitCriteria(val))}/>}
				{collection == "nodes" &&
				<CheckBox ml={10} enabled={enabled} text="addPhrasing" value={PermitCriteriaToCheckBoxVal(value.addPhrasing)} onChange={val=>Change(a=>a.addPhrasing = CheckBoxValToPermitCriteria(val))}/>}
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
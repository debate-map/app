import {AccessPolicy, GetUser, PermissionSet, PermissionSetForType, PermitCriteria} from "dm_common";
import React from "react";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI.js";
import {DetailsUIBaseProps, useDetailsUI} from "UI/@Shared/DetailsUI_Base";
import {userIDPlaceholder} from "UI/@Shared/Maps/MapUI/ActionBar_Left/PeopleDropDown";
import {UserPicker} from "UI/@Shared/Users/UserPicker";
import {RunCommand_AddAccessPolicy} from "Utils/DB/Command.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {InfoButton, TextPlus} from "web-vcore";
import {Clone, E} from "js-vextensions";
import {Button, CheckBox, Column, Row, RowLR, Text, TextInput} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {observer_mgl} from "mobx-graphlink";

export type PolicyDetailsUIProps = DetailsUIBaseProps<AccessPolicy, {}>

export const PolicyDetailsUI = observer_mgl((props: PolicyDetailsUIProps)=>{
	const {baseData, style, phase, onChange} = props;
	const {newData, helpers} = useDetailsUI<AccessPolicy>({
		baseData,
		phase,
		onChange,
	});
	const {Change, creating, enabled} = helpers;

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
			<Row center>
				<Text>Permissions:</Text>
				<InfoButton ml={5} text={`
					These are the permissions that are granted to all visitors. (for mere viewing/access, this includes those not signed in)

					Note that there are a few additional permission-grants:
					* The creator of an entry can always access an entry (and currently, modify it).
					* Admins can access any entry, and can modify (almost) any entry.
					* Moderators can modify (almost) any entry *that they have access to*. (ie. if something is made accessible/visible to the general public, then mods can modify it)
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
});

type PermissionSetEditorProps = {
	enabled?: boolean;
	value: PermissionSet;
	onChange: (val: PermissionSet)=>any;
};

export const PermissionSetEditor = ({enabled, value, onChange}: PermissionSetEditorProps)=>{
	const change = (setter: (newVal: PermissionSet)=>any)=>{
		const newVal = Clone(value);
		setter(newVal);
		onChange(newVal);
	};
	const splitAt = 100;

	return (
		<Column pl={10}>
			<RowLR mt={5} splitAt={splitAt}>
				<Text>Terms:</Text>
				<PermissionSetForTypeEditor enabled={enabled} collection="terms" value={value.terms} onChange={val=>change(a=>a.terms = val)}/>
			</RowLR>
			<RowLR mt={5} splitAt={splitAt}>
				<Text>Medias:</Text>
				<PermissionSetForTypeEditor enabled={enabled} collection="medias" value={value.medias} onChange={val=>change(a=>a.medias = val)}/>
			</RowLR>
			<RowLR mt={5} splitAt={splitAt}>
				<TextPlus info={"Also affects the partially or fully derivative permissions for entries in tables:\n* mapNodeEdits\n* timelines\n* timelineSteps"}>Maps:</TextPlus>
				<PermissionSetForTypeEditor enabled={enabled} collection="maps" value={value.maps} onChange={val=>change(a=>a.maps = val)}/>
			</RowLR>
			<RowLR mt={5} splitAt={splitAt}>
				<TextPlus info={"Also affects the partially or fully derivative permissions for entries in tables:\n* mapNodeEdits\n* nodeLinks\n* nodePhrasings\n* nodeRatings\n* nodeRevisions\n* nodeTags\n* commandRuns"}>Nodes:</TextPlus>
				<PermissionSetForTypeEditor enabled={enabled} collection="nodes" value={value.nodes} onChange={val=>change(a=>a.nodes = val)}/>
			</RowLR>
			<RowLR mt={5} splitAt={splitAt}>
				<Text>Node ratings:</Text>
				<PermissionSetForTypeEditor enabled={enabled} collection="nodeRatings" value={value.nodeRatings} onChange={val=>change(a=>a.nodeRatings = val)}/>
			</RowLR>
			<RowLR mt={5} splitAt={splitAt}>
				<TextPlus info={"Currently controls permissions for entries in tables:\n* timelines\n* timelineSteps (derived from timelines)"}>Others:</TextPlus>
				<PermissionSetForTypeEditor enabled={enabled} collection="others" value={value.others} onChange={val=>change(a=>a.others = val)}/>
			</RowLR>
		</Column>
	);
}

type PermissionSetForTypeEditorProps = {
	enabled?: boolean;
	collection: string;
	value: PermissionSetForType;
	onChange: (val: PermissionSetForType)=>any;
};

const PermissionSetForTypeEditor = ({enabled, collection, value, onChange}: PermissionSetForTypeEditorProps)=>{
	const change = (setter: (newVal: PermissionSetForType)=>any)=>{
		const newVal = Clone(value);
		setter(newVal);
		onChange(newVal);
	};

	const permitCriteriaToCheckBoxVal = (criteria: PermitCriteria|n)=>criteria?.minApprovals == 0;
	const checkBoxValToPermitCriteria = (val: boolean)=>new PermitCriteria({minApprovals: val ? 0 : -1, minApprovalPercent: val ? 0 : -1});

	// TODO: make this UI support the full set of PermitCriteria values (once there is reputation data for it to actually be compared against)
	return (
		<Row>
			<CheckBox enabled={enabled} text="access" value={value.access ?? "partial"} onChange={val=>change(a=>a.access = val)}/>
			{collection != "nodeRatings" &&
			<CheckBox ml={10} enabled={enabled} text="modify" value={permitCriteriaToCheckBoxVal(value.modify)} onChange={val=>change(a=>a.modify = checkBoxValToPermitCriteria(val))}/>}
			{collection != "nodeRatings" &&
			<CheckBox ml={10} enabled={enabled} text="delete" value={permitCriteriaToCheckBoxVal(value.delete)} onChange={val=>change(a=>a.delete = checkBoxValToPermitCriteria(val))}/>}
			{collection == "nodes" &&
			<CheckBox ml={10} enabled={enabled} text="addChild" value={permitCriteriaToCheckBoxVal(value.addChild)} onChange={val=>change(a=>a.addChild = checkBoxValToPermitCriteria(val))}/>}
			{collection == "nodes" &&
			<CheckBox ml={10} enabled={enabled} text="addPhrasing" value={permitCriteriaToCheckBoxVal(value.addPhrasing)} onChange={val=>change(a=>a.addPhrasing = checkBoxValToPermitCriteria(val))}/>}
			{collection == "nodes" &&
			<CheckBox ml={10} enabled={enabled} text="vote" value={permitCriteriaToCheckBoxVal(value.vote)} onChange={val=>change(a=>a.vote = checkBoxValToPermitCriteria(val))}/>}
		</Row>
	);
}

export const ShowAddAccessPolicyDialog = (initialData?: Partial<AccessPolicy>, postAdd?: (id: string)=>void)=>{
	let newEntry = new AccessPolicy(E({
		name: "",
	}, initialData));

	const boxController: BoxController = ShowMessageBox({
		title: "Add access-policy", cancelButton: true,
		message: observer_mgl(()=>{
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<PolicyDetailsUI baseData={newEntry} phase="create"
						onChange={val=>{
							newEntry = val;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		}),
		onOK: async()=>{
			const {id} = await RunCommand_AddAccessPolicy(newEntry);
			if (postAdd) postAdd(id);
		},
	});
};

import {Column, Row, Pre, Button, TextInput, Div, CheckBox, Select, ColorPickerBox, Text, Spinner, RowLR} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {presetBackgrounds, defaultPresetBackground} from "Utils/UI/PresetBackgrounds.js";
import {PageContainer, ES, Chroma_Safe, RunInAction_Set, Chroma, TextPlus} from "web-vcore";
import React, {Fragment} from "react";
import {PropNameToTitle} from "Utils/General/Others.js";
import {ScrollView} from "react-vscrollview";
import {E, GetEntries} from "js-vextensions";
import {MeID, GetUser, GetUserHidden, GetUserPermissionGroups, User, GetUserFollows_List, UserFollow, UserHidden, accessPolicyFallbackInfo} from "dm_common";
import {ProfilePanel} from "Store/main/profile";
import {store} from "Store";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_SetUserFollowData, RunCommand_UpdateUser, RunCommand_UpdateUserHidden} from "Utils/DB/Command";
import {GetUserBackground} from "Store/db_ext/users/$user";
import {PolicyPicker, PolicyPicker_Button} from "../Policies/PolicyPicker.js";
import {observer_mgl} from "mobx-graphlink";

export type UserProfileUI_Props = {user: User|n};
export type UserProfileUI_SharedProps = Omit<UserProfileUI_Props, "user"> & {
	user: User;
	meID: string|n;
	me: User|n,
	ownProfile: boolean;
	userHidden: UserHidden|n;
};

export const UserProfileUI = observer_mgl(({user}: UserProfileUI_Props)=>{
	const state = store.main.profile;
	if (!user) return <PageContainer>User does not exist.</PageContainer>;

	const meID = MeID();
	const me = GetUser(meID);
	const ownProfile = user.id === meID;
	const panelFinal = ownProfile ? state.panel : ProfilePanel.general;
	const userHidden = ownProfile ? GetUserHidden(user.id) : null;

	const sharedProps: UserProfileUI_SharedProps = {user, meID, me, ownProfile, userHidden};

	return (
		<PageContainer>
			<Row>
				<Text>Username: {user.displayName}</Text>
				{ownProfile &&
				<Button ml={5} text="Change" onClick={()=>{
					ShowChangeDisplayNameDialog(user.id, user.displayName);
				}}/>}
			</Row>

			{ownProfile && <Row mt={5} mb={5}>
				<Select displayType="button bar" options={GetEntries(ProfilePanel, "ui")} value={state.panel} onChange={val=>RunInAction_Set(()=>state.panel = val)}/>
			</Row>}

			{panelFinal === ProfilePanel.general && <UserProfileUI_General {...sharedProps}/>}
			{panelFinal === ProfilePanel.appearance && <UserProfileUI_Appearance {...sharedProps}/>}
			{panelFinal === ProfilePanel.notifications && <UserProfileUI_Notifications {...sharedProps}/>}
		</PageContainer>
	);
});

export const UserProfileUI_General = observer_mgl((props: UserProfileUI_SharedProps)=>{
	const {user, meID, me, ownProfile, userHidden} = props;

	const userPermissionGroups = GetUserPermissionGroups(user ? user.id : null);
	const meFollows = GetUserFollows_List(meID);
	const profileUserFollow = meFollows.find(a=>a.targetUser == user.id);
	const admin = meID != null && !!GetUserPermissionGroups(meID)?.admin;

	const splitAt = 250;
	return (
        <>
			<Row mt={3}>
				<Pre>Permissions: </Pre>
				{["basic", "verified", "mod", "admin"].map((group, index)=>{
					const changingOwnAdminState = me != null && user.id === me.id && group === "admin";
					return (
						<CheckBox key={index} mr={index < 3 ? 5 : 0} text={PropNameToTitle(group)} value={(userPermissionGroups || {})[group]} enabled={admin && !changingOwnAdminState} onChange={val=>{
							const newPermissionGroups = E(userPermissionGroups, {[group]: val});
							RunCommand_UpdateUser({id: user.id, updates: {permissionGroups: newPermissionGroups}});
						}}/>
					);
				})}
			</Row>

			{userHidden != null && <>
				<Row mt={3} style={{fontWeight: "bold"}}>Default access policies:</Row>
				<RowLR mt={3} splitAt={splitAt}>
					<TextPlus info="The access-policy that is used when you give ratings to nodes (unless you manually override the policy during or after creation).">Node ratings:</TextPlus>
					<PolicyPicker value={userHidden.extras.defaultAccessPolicy_nodeRatings} onChange={val=>{
						RunCommand_UpdateUserHidden({id: user.id, updates: {extras: {...userHidden.extras, defaultAccessPolicy_nodeRatings: val!}}});
					}}>
						<PolicyPicker_Button enabled={ownProfile} policyID={userHidden.extras.defaultAccessPolicy_nodeRatings} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>
				<RowLR mt={3} splitAt={splitAt}>
					<TextPlus info={`
						This is used as the access-policy for new entries you create, if does not have a default set by other means.

						In more detail: ${accessPolicyFallbackInfo}
					`.AsMultiline(0)}>Generic fallback:</TextPlus>
					<PolicyPicker value={userHidden.lastAccessPolicy} onChange={val=>RunCommand_UpdateUserHidden({id: user.id, updates: {lastAccessPolicy: val!}})}>
						<PolicyPicker_Button enabled={ownProfile} policyID={userHidden?.lastAccessPolicy} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>
			</>}

			{!ownProfile &&
			<Row mt={3}>
				<CheckBox text="Follow" value={profileUserFollow != null} onChange={async val=>{
					if (val) {
						await RunCommand_SetUserFollowData({targetUser: user.id, userFollow: new UserFollow()});
					} else {
						await RunCommand_SetUserFollowData({targetUser: user.id, userFollow: null});
					}
				}}/>
				{profileUserFollow &&
				<>
					<CheckBox ml={5} text="Mark ratings" value={profileUserFollow.markRatings} onChange={async val=>{
						await RunCommand_SetUserFollowData({
							targetUser: user.id,
							userFollow: {...profileUserFollow, markRatings: val},
						});
					}}/>
					<Text ml={5}>Symbol:</Text>
					<TextInput ml={5} style={{width: 30}} value={profileUserFollow.markRatings_symbol} onChange={async val=>{
						await RunCommand_SetUserFollowData({
							targetUser: user.id,
							userFollow: {...profileUserFollow, markRatings_symbol: val},
						});
					}}/>
					<Text ml={5} mr={5}>Color:</Text>
					<ColorPickerBox color={Chroma_Safe(profileUserFollow.markRatings_color).rgba()} onChange={async val=>{
						await RunCommand_SetUserFollowData({
							targetUser: user.id,
							userFollow: {...profileUserFollow, markRatings_color: Chroma(val).css()},
						});
					}}/>
					<Text ml={5}>Size:</Text>
					<Spinner ml={5} value={profileUserFollow.markRatings_size} onChange={async val=>{
						await RunCommand_SetUserFollowData({
							targetUser: user.id,
							userFollow: {...profileUserFollow, markRatings_size: val},
						});
					}}/>
				</>}
			</Row>}
			{ownProfile &&
			<>
				<Row mt={10} mb={5} style={{fontSize: 15, fontWeight: "bold"}}>Tools</Row>
				<Row>
					<Button text="Clear local data" onClick={()=>{
						ShowMessageBox({title: "Clear local data?", cancelButton: true,
							message: `
								Are you sure you want to clear local data?

								Some of the things this will clear: (not exhaustive)
								* The expansion-states of maps.
								* Display settings.

								Some of the things this won't clear:
								* The content you've added to maps.
								* Your posts and comments.

								This is usually only done if an error is occuring because of outdated or invalid data.
							`.AsMultiline(0),
							onOK: ()=>{
								window.location.reload();
							},
						});
					}}/>
				</Row>
			</>}

		</>
	)
})

export const UserProfileUI_Appearance = observer_mgl((props: UserProfileUI_SharedProps)=>{
	const {user, ownProfile, userHidden: profileUser_h} = props;

	return <>
		{ownProfile && profileUser_h &&
		<Fragment>
			<Row mt={10} mb={5} style={{fontSize: 15, fontWeight: "bold"}}>Customization</Row>
			<Row mt={5}>Background:</Row>
			<ScrollView mt={5} style={{height: 450, background: liveSkin.OverlayPanelBackgroundColor().css()}}>
				<Row style={{flexWrap: "wrap"}}>
					{Object.entries(presetBackgrounds).map(([id, background], propIndex)=>{
						const selected = (profileUser_h!.backgroundID || defaultPresetBackground) === id;
						return (
							<Div key={propIndex}
								style={ES(
									{width: 100, height: 100, border: "1px solid black", cursor: "pointer"},
									background.url_max?.startsWith("background: ") && {background: background.url_max.replace("background: ", "")},
									!background.url_max?.startsWith("background: ") && {
										backgroundColor: background.color, backgroundPosition: "center", backgroundSize: "cover",
										backgroundImage: `url(${background.url_256 || background.url_1920 || background.url_3840 || background.url_max})`,
									},
									selected && {border: "1px solid rgba(255,255,255,.7)"},
								)}
								onClick={()=>{
									RunCommand_UpdateUserHidden({id: user.id, updates: {backgroundID: id}});
								}}>
							</Div>
						);
					})}
				</Row>
			</ScrollView>
			<Row mt={5}>
				<CheckBox text="Custom background" value={profileUser_h.backgroundCustom_enabled ?? false} onChange={val=>{
					RunCommand_UpdateUserHidden({id: user.id, updates: {backgroundCustom_enabled: val}});
				}}/>
			</Row>
			<Row mt={5}>
				<Pre>Color: </Pre>
				<ColorPickerBox color={Chroma_Safe(profileUser_h.backgroundCustom_color ?? "#FFFFFF").rgba()} onChange={val=>{
					RunCommand_UpdateUserHidden({id: user.id, updates: {backgroundCustom_color: Chroma(val).css()}});
				}}/>
				<Button ml={5} text="Clear" onClick={()=>{
					RunCommand_UpdateUserHidden({id: user.id, updates: {backgroundCustom_color: null}});
				}}/>
			</Row>
			<Row mt={5}>
				<Pre>URL: </Pre>
				<TextInput style={ES({flex: 1})}
					value={profileUser_h.backgroundCustom_url} onChange={val=>{
						RunCommand_UpdateUserHidden({id: user.id, updates: {backgroundCustom_url: val}});
					}}/>
				<Button ml={5} mdIcon="scanner" title="Set to the currently-selected, non-custom background-image. (eg. for customization)" onClick={()=>{
					RunCommand_UpdateUserHidden({id: user.id, updates: {backgroundCustom_url: GetUserBackground(user.id, false).url_max}});
				}}/>
			</Row>
			<Row mt={5}>
				<Pre>Anchor: </Pre>
				<Select options={[{name: "top", value: "center top"}, {name: "center", value: "center center"}, {name: "bottom", value: "center bottom"}]}
					value={profileUser_h.backgroundCustom_position || "center center"} onChange={val=>{
						RunCommand_UpdateUserHidden({id: user.id, updates: {backgroundCustom_position: val}});
					}}/>
			</Row>
		</Fragment>}
	</>;
});

export const UserProfileUI_Notifications = observer_mgl((props: UserProfileUI_SharedProps)=>{
	const {user, userHidden} = props;

	return <>
		<Row mt={10} mb={5} style={{fontSize: 15, fontWeight: "bold"}}>General Settings</Row>
		<Row>
			<CheckBox mr={5} value={userHidden?.notificationPolicy === "S"} enabled onChange={val=>{
				RunCommand_UpdateUserHidden({id: user.id, updates: {notificationPolicy: val ? "S" : "N"}});
			}}/>
			<TextPlus info="Automatically receive notifications for nodes you create/add revisions to.">Auto-subscrbibe to notifications</TextPlus>
		</Row>
	</>;
});

export const ShowChangeDisplayNameDialog = (userID: string, oldDisplayName: string)=>{
	let newDisplayName = oldDisplayName;

	const valid = true;
	const boxController: BoxController = ShowMessageBox({
		title: "Change display name", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonProps = {enabled: valid};
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<Row>
						<Pre>Display name: </Pre>
						<TextInput value={newDisplayName} onChange={val=>{
							newDisplayName = val;
							boxController.UpdateUI();
						}}/>
					</Row>
				</Column>
			);
		},
		onOK: ()=>{
			RunCommand_UpdateUser({id: userID, updates: {displayName: newDisplayName}});
		},
	});
};

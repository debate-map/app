import {BaseComponent, BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {Column, Row, Pre, Button, TextInput, Div, CheckBox, Select, ColorPickerBox, Text, Spinner, RowLR} from "web-vcore/nm/react-vcomponents.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {presetBackgrounds, defaultPresetBackground} from "Utils/UI/PresetBackgrounds.js";
import {PageContainer, Observer, ES, Chroma_Safe, RunInAction_Set, Chroma, TextPlus} from "web-vcore";
import React, {Fragment} from "react";
import {PropNameToTitle} from "Utils/General/Others.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {E, GetEntries} from "web-vcore/nm/js-vextensions.js";
import {MeID, GetUser, GetUserHidden, GetUserPermissionGroups, SetUserData, SetUserData_Hidden, User, GetUserFollows_List, SetUserFollowData, UserFollow, UserHidden, accessPolicyFallbackInfo} from "dm_common";
import chroma from "web-vcore/nm/chroma-js.js";
import {ProfilePanel} from "Store/main/profile";
import {store} from "Store";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_SetUserFollowData, RunCommand_UpdateUser, RunCommand_UpdateUserHidden} from "Utils/DB/Command";
import {GetUserBackground} from "Store/db_ext/users/$user";
import {PolicyPicker, PolicyPicker_Button} from "../Policies/PolicyPicker";

// todo: move these to a better, more widely usable place
/*type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;*/

export type UserProfileUI_Props = {user: User|n};
export type UserProfileUI_SharedProps = Omit<UserProfileUI_Props, "user"> & {
	user: User;
	meID: string|n;
	me: User|n,
	ownProfile: boolean;
	userHidden: UserHidden|n;
};

@Observer
export class UserProfileUI extends BaseComponentPlus({} as UserProfileUI_Props, {}) {
	render() {
		const {user} = this.props;
		const state = store.main.profile;
		if (user == null) return <PageContainer>User does not exist.</PageContainer>;

		const meID = MeID();
		const me = GetUser(meID);
		const ownProfile = user.id == meID;
		const panel_final = ownProfile ? state.panel : ProfilePanel.general;
		const userHidden = ownProfile ? GetUserHidden(user.id) : null;
		//if (userHidden == null) return <PageContainer>Loading...</PageContainer>;

		const sharedProps: UserProfileUI_SharedProps = {...this.props, user, meID, me, ownProfile, userHidden};
		return (
			<PageContainer>
				<Row>
					<Text>Username: {user.displayName}</Text>
					{ownProfile &&
					<Button ml={5} text="Change" onClick={()=>{
						ShowChangeDisplayNameDialog(user.id, user.displayName);
					}}/>}
				</Row>
				{ownProfile &&
				<Row mt={5} mb={5}>
					<Select displayType="button bar" options={GetEntries(ProfilePanel, "ui")} value={state.panel} onChange={val=>RunInAction_Set(this, ()=>state.panel = val)}/>
				</Row>}
				{panel_final == ProfilePanel.general && <UserProfileUI_General {...sharedProps}/>}
				{panel_final == ProfilePanel.appearance && <UserProfileUI_Appearance {...sharedProps}/>}
				{panel_final == ProfilePanel.notifications && <UserProfileUI_Notifications {...sharedProps}/>}
			</PageContainer>
		);
	}
}

@Observer
class UserProfileUI_General extends BaseComponent<UserProfileUI_SharedProps, {}> {
	render() {
		const {user, meID, me, ownProfile, userHidden} = this.props;
		const userPermissionGroups = GetUserPermissionGroups(user ? user.id : null);
		const meFollows = GetUserFollows_List(meID);
		const profileUserFollow = meFollows.find(a=>a.targetUser == user.id);

		const splitAt = 250;
		return <>
			<Row mt={3}>
				<Pre>Permissions: </Pre>
				{["basic", "verified", "mod", "admin"].map((group, index)=>{
					const admin = meID != null && GetUserPermissionGroups(MeID()).admin;
					const changingOwnAdminState = me != null && user.id == me.id && group == "admin";
					return (
						<CheckBox key={index} mr={index < 3 ? 5 : 0} text={PropNameToTitle(group)} value={(userPermissionGroups || {})[group]} enabled={admin && !changingOwnAdminState} onChange={val=>{
							const newPermissionGroups = E(userPermissionGroups, {[group]: val});
							//new SetUserData({id: user.id, updates: {permissionGroups: newPermissionGroups}}).RunOnServer();
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
						RunCommand_UpdateUserHidden({id: user.id, updates: {extras: {...userHidden.extras, defaultAccessPolicy_nodeRatings: val}}});
					}}>
						<PolicyPicker_Button enabled={ownProfile} policyID={userHidden.extras.defaultAccessPolicy_nodeRatings} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>
				<RowLR mt={3} splitAt={splitAt}>
					<TextPlus info={`
						This is used as the access-policy for new entries you create, if does not have a default set by other means.

						In more detail: ${accessPolicyFallbackInfo}
					`.AsMultiline(0)}>Generic fallback:</TextPlus>
					<PolicyPicker value={userHidden.lastAccessPolicy} onChange={val=>RunCommand_UpdateUserHidden({id: user.id, updates: {lastAccessPolicy: val}})}>
						<PolicyPicker_Button enabled={ownProfile} policyID={userHidden?.lastAccessPolicy} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>
			</>}
			{!ownProfile &&
			<Row mt={3}>
				<CheckBox text="Follow" value={profileUserFollow != null} onChange={async val=>{
					if (val) {
						//new SetUserFollowData({targetUser: user.id, userFollow: new UserFollow()}).RunOnServer();
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
								// ClearLocalData(persister);
								// todo
								window.location.reload();
							},
						});
					}}/>
				</Row>
			</>}
		</>;
	}
}

@Observer
class UserProfileUI_Appearance extends BaseComponent<UserProfileUI_SharedProps, {}> {
	render() {
		const {user, ownProfile, userHidden: profileUser_h} = this.props;

		return <>
			{ownProfile && profileUser_h &&
			<Fragment>
				<Row mt={10} mb={5} style={{fontSize: 15, fontWeight: "bold"}}>Customization</Row>
				<Row mt={5}>Background:</Row>
				<ScrollView mt={5} style={{height: 450, background: liveSkin.OverlayPanelBackgroundColor().css()}}>
					<Row style={{flexWrap: "wrap"}}>
						{Object.entries(presetBackgrounds).map(([id, background], propIndex)=>{
							const selected = (profileUser_h!.backgroundID || defaultPresetBackground) == id;
							return (
								<Div key={propIndex}
									style={ES(
										{width: 100, height: 100, border: "1px solid black", cursor: "pointer"},
										background.url_max?.startsWith("background: ") && {background: background.url_max.replace("background: ", "")},
										!background.url_max?.startsWith("background: ") && {
											backgroundColor: background.color, backgroundImage: `url(${background.url_256 || background.url_1920 || background.url_3840 || background.url_max})`,
											backgroundPosition: "center", backgroundSize: "cover",
										},
										selected && {border: "1px solid rgba(255,255,255,.7)"},
									)}
									onClick={()=>{
										//new SetUserData_Hidden({id: user.id, updates: {backgroundID: id}}).RunOnServer();
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
	}
}

/*
Attempt 1
==========
class NotificationGroup {
	name: string;
	type: AddMap|AddNode|etc.;
	filters: [{actorID: string}];
	level: number;
	behaviors: Behavior[];
}
class Behavior {
	type: "site_notify" | "email_digest" | "email_instant";
	// if site_notify
	obvious: boolean;
}
const GetStartGroupsForType = type=>[
	new NotificationGroup({name: "L1", type, level: 1, behaviors: [
		new Behavior({type: "site_notify"}),
		new Behavior({type: "email_digest"}),
	]}),
	new NotificationGroup({name: "L2", type, level: 2, behaviors: [
		new Behavior({type: "site_notify", obvious: true}),
		new Behavior({type: "email_digest"}),
	]}),
	new NotificationGroup({name: "L3", type, level: 3, behaviors: [
		new Behavior({type: "site_notify", obvious: true}),
		new Behavior({type: "email_digest"}),
		new Behavior({type: "email_instant"}),
	]}),
];

Attempt 2
==========
class User {
	actionSignificances_base: {
		[key: ActionType]: "default" | "keepAtLeast:X" | "set:X";
	};
	userFollows: {[key: string]: UserFollow}
}
class UserFollow {
	targetUser: string;
	actionSignificances_forThisUser: {
		[key: ActionType]: "default" | "keepAtLeast:X" | "set:X";
	};
}

class Behavior {}
const behaviors = {
	site_notify_silent: {minLevel: 1, maxLevel: 1},
	site_notify_obvious: {minLevel: 2, maxLevel: 2},
	email_digest: {minLevel: 3, maxLevel: 3},
	email_instant: {minLevel: 4, maxLevel: 4},
};

class Event {
	defaultLevel: number;
}
const events = [
	AddMap: {defaultLevel: 4},
	EditNode: {defaultLevel: 1},
	DeleteNode: {defaultLevel: 4},
];
*/

@Observer
class UserProfileUI_Notifications extends BaseComponent<UserProfileUI_SharedProps, {}> {
	render() {
		const {user} = this.props;

		return <>
		</>;
	}
}

export function ShowChangeDisplayNameDialog(userID: string, oldDisplayName: string) {
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
			//new SetUserData({id: userID, updates: {displayName: newDisplayName}}).RunOnServer();
			RunCommand_UpdateUser({id: userID, updates: {displayName: newDisplayName}});
		},
	});
}
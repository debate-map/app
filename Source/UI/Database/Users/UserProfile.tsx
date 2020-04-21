import {BaseComponent, BaseComponentWithConnector, BaseComponentPlus} from "react-vextensions";
import {Column, Row, Pre, Button, TextInput, Div, CheckBox, Select, ColorPickerBox, Text} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {presetBackgrounds, defaultPresetBackground} from "Utils/UI/PresetBackgrounds";
import {PageContainer, Observer} from "vwebapp-framework";
import {styles, ES} from "Utils/UI/GlobalStyles";
import {Fragment} from "react";
import {PropNameToTitle} from "Utils/General/Others";
import {ScrollView} from "react-vscrollview";
import {E} from "js-vextensions";
import {MeID, GetUser} from "@debate-map/server-link/Source/Link";
import {GetUser_Private} from "@debate-map/server-link/Source/Link";
import {GetUserPermissionGroups} from "@debate-map/server-link/Source/Link";
import {SetUserData} from "@debate-map/server-link/Source/Link";
import {SetUserData_Private} from "@debate-map/server-link/Source/Link";
import {User} from "@debate-map/server-link/Source/Link";

@Observer
export class UserProfileUI extends BaseComponentPlus({} as {profileUser: User}, {}) {
	render() {
		const {profileUser} = this.props;
		if (profileUser == null) return <PageContainer>User does not exist.</PageContainer>;
		const profileUser_p = profileUser._key == MeID() ? GetUser_Private(profileUser._key) : null;
		//if (profileUser_p == null) return <PageContainer>Loading...</PageContainer>;

		const userID = MeID();
		const profileUserPermissionGroups = GetUserPermissionGroups(profileUser ? profileUser._key : null);
		const currentUser = GetUser(userID);

		return (
			<PageContainer>
				<Row>
					<Text>Username: {profileUser.displayName}</Text>
					{profileUser == currentUser &&
						<Button ml={5} text="Change" onClick={()=>{
							ShowChangeDisplayNameDialog(currentUser._key, currentUser.displayName);
						}}/>}
				</Row>
				<Row mt={3}>
					<Pre>Permissions: </Pre>
					{["basic", "verified", "mod", "admin"].map((group, index)=>{
						const admin = userID && GetUserPermissionGroups(MeID()).admin;
						const changingOwnAdminState = currentUser && profileUser._key == currentUser._key && group == "admin";
						return (
							<CheckBox key={index} mr={index < 3 ? 5 : 0} text={PropNameToTitle(group)} value={(profileUserPermissionGroups || {})[group]} enabled={admin && !changingOwnAdminState} onChange={val=>{
								const newPermissionGroups = E(profileUserPermissionGroups, {[group]: val});
								new SetUserData({id: profileUser._key, updates: {permissionGroups: newPermissionGroups}}).Run();
							}}/>
						);
					})}
				</Row>

				{profileUser == currentUser && profileUser_p &&
					<Fragment>
						<Row mt={10} mb={5} style={{fontSize: 15, fontWeight: "bold"}}>Customization</Row>
						<Row mt={5}>Background:</Row>
						<ScrollView mt={5} style={{height: 450, background: "rgba(0,0,0,.7)"}}>
							<Row style={{flexWrap: "wrap"}}>
								{presetBackgrounds.Pairs().map(prop=>{
									const id = prop.key;
									const background = prop.value;
									const selected = (profileUser_p.backgroundID || defaultPresetBackground) == id;
									return (
										<Div key={prop.index}
											style={E(
												{
													width: 100, height: 100, border: "1px solid black", cursor: "pointer",
													backgroundColor: background.color, backgroundImage: `url(${background.url_256 || background.url_1920 || background.url_3840 || background.url_max})`,
													backgroundPosition: "center", backgroundSize: "cover",
												},
												selected && {border: "1px solid rgba(255,255,255,.7)"},
											)}
											onClick={()=>{
												new SetUserData_Private({id: profileUser._key, updates: {backgroundID: id}}).Run();
											}}>
										</Div>
									);
								})}
							</Row>
						</ScrollView>
						<Row mt={5}>
							<CheckBox text="Custom background" value={profileUser_p.backgroundCustom_enabled} onChange={val=>{
								new SetUserData_Private({id: profileUser._key, updates: {backgroundCustom_enabled: val}}).Run();
							}}/>
						</Row>
						<Row mt={5}>
							<Pre>Color: </Pre>
							<ColorPickerBox color={profileUser_p.backgroundCustom_color || "#FFFFFF"} onChange={val=>{
								new SetUserData_Private({id: profileUser._key, updates: {backgroundCustom_color: val}}).Run();
							}}/>
							<Button ml={5} text="Clear" onClick={()=>{
								new SetUserData_Private({id: profileUser._key, updates: {backgroundCustom_color: null}}).Run();
							}}/>
						</Row>
						<Row mt={5}>
							<Pre>URL: </Pre>
							<TextInput delayChangeTillDefocus={true} style={ES({flex: 1})}
								value={profileUser_p.backgroundCustom_url} onChange={val=>{
									new SetUserData_Private({id: profileUser._key, updates: {backgroundCustom_url: val}}).Run();
								}}/>
						</Row>
						<Row mt={5}>
							<Pre>Anchor: </Pre>
							<Select options={[{name: "top", value: "center top"}, {name: "center", value: "center center"}, {name: "bottom", value: "center bottom"}]}
								value={profileUser_p.backgroundCustom_position || "center center"} onChange={val=>{
									new SetUserData_Private({id: profileUser._key, updates: {backgroundCustom_position: val}}).Run();
								}}/>
						</Row>
					</Fragment>}

				{profileUser == currentUser &&
					<Fragment>
						<Row mt={10} mb={5} style={{fontSize: 15, fontWeight: "bold"}}>Tools</Row>
						<Row>
							<Button text="Clear local data" onClick={()=>{
								ShowMessageBox({title: "Clear local data?", cancelButton: true, message:
		`Are you sure you want to clear local data?

		Some of the things this will clear: (not exhaustive)
		* The expansion-states of maps.
		* Display settings.

		Some of the things this won't clear:
		* The content you've added to maps.
		* Your posts and comments.

		This is usually only done if an error is occuring because of outdated or invalid data.`,
								onOK: ()=>{
									// ClearLocalData(persister);
									// todo
									window.location.reload();
								},
								});
							}}/>
						</Row>
					</Fragment>}
			</PageContainer>
		);
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
			new SetUserData({id: userID, updates: {displayName: newDisplayName}}).Run();
		},
	});
}
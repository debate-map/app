import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import {Column, Row, Pre, Button, TextInput, Div, CheckBox, Select} from "react-vcomponents";
import {Connect} from "Frame/Database/FirebaseConnect";
import {GetUser, GetUserID} from "Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import { UpdateProfile } from "Server/Commands/UpdateProfile";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {ACTTopRightOpenPanelSet} from "../Store/main";

export let backgrounds = {
	1: {
		url_1920: "https://firebasestorage.googleapis.com/v0/b/debate-map-dev.appspot.com/o/Backgrounds%2FOcean_x1920.jpg?alt=media&token=53fc5864-a6de-431b-a724-fe4f9305f336",
		url_3840: "https://firebasestorage.googleapis.com/v0/b/debate-map-dev.appspot.com/o/Backgrounds%2FOcean_x3840.jpg?alt=media&token=2d1c25f3-a25e-4cb4-8586-06f419e4d63c",
		position: "center bottom",
	},
	2: {
		url_1920: "https://firebasestorage.googleapis.com/v0/b/debate-map-dev.appspot.com/o/Backgrounds%2FNebula_x1920.jpg?alt=media&token=f2fec09e-7394-4453-a08e-7f8608553e14",
		url_3840: "https://firebasestorage.googleapis.com/v0/b/debate-map-dev.appspot.com/o/Backgrounds%2FNebula_x2560.jpg?alt=media&token=c4ed8a83-d9ed-410f-9ae1-1d830355349a",
	},
};

type Props = {} & Partial<{user: User}>;
@Connect((state, props: Props)=> ({
	user: GetUser(GetUserID()),
}))
export default class ProfileUI extends BaseComponent<Props, {}> {
	render() {
		let {user} = this.props;
		if (user == null) return <Column style={styles.page}>Must be signed-in to access.</Column>;

		return (
			<Column style={styles.page}>
				<Row>
					<Pre>Username: {user.displayName}</Pre>
					<Button ml={5} text="Change" onClick={()=> {
						ShowChangeDisplayNameDialog(user._key, user.displayName);
					}}/>
				</Row>
				<Row>Background image:</Row>
				<Column style={{background: "rgba(0,0,0,.7)"}}>
					<Row>
						{backgrounds.Props().map(prop=> {
							let id = prop.name.ToInt();
							let background = prop.value;
							let selected = (user.backgroundID || 1) == id;
							return (
								<Div key={prop.index}
									style={E(
										{
											width: 100, height: 100, border: "1px solid black", cursor: "pointer",
											background: `url(${background.url_1920})`, backgroundPosition: "center", backgroundSize: "cover",
										},
										selected && {border: "1px solid rgba(255,255,255,.3)"},
									)}
									onClick={()=> {
										new UpdateProfile({id: user._key, updates: {backgroundID: id}}).Run();
									}}>
								</Div>
							);
						})}
					</Row>
				</Column>
				<Row mt={5}>
					<CheckBox text="Custom background" checked={user.backgroundCustom_enabled} onChange={val=> {
						new UpdateProfile({id: user._key, updates: {backgroundCustom_enabled: val}}).Run();
					}}/>
				</Row>
				<Row mt={5}>
					<Pre>URL: </Pre>
					<TextInput delayChangeTillDefocus={true} style={ES({flex: 1})}
						value={user.backgroundCustom_url} onChange={val=> {
							new UpdateProfile({id: user._key, updates: {backgroundCustom_url: val}}).Run();
						}}/>
				</Row>
				<Row mt={5}>
					<Pre>Anchor: </Pre>
					<Select options={[{name: "top", value: "center top"}, {name: "center", value: "center center"}, {name: "bottom", value: "center bottom"}]}
						value={user.backgroundCustom_position || "center center"} onChange={val=> {
							new UpdateProfile({id: user._key, updates: {backgroundCustom_position: val}}).Run();
						}}/>
				</Row>
				<Row mt={5}><h4>Tools</h4></Row>
				<Row>
					<Button text="Clear local data" onClick={()=> {
						ShowMessageBox({title: `Clear local data?`, cancelButton: true, message:
`Are you sure you want to clear local data?

Some of the things this will clear: (not exhaustive)
* The expansion-states of maps.
* Display settings.

Some of the things this won't clear:
* The content you've added to maps.
* Your posts and comments.

This is usually only done if an error is occuring because of outdated or invalid data.`,
							onOK: ()=> {
								let {ClearLocalData} = require("Frame/Store/CreateStore");
								ClearLocalData(persister);
								window.location.reload();
							}
						});
					}}/>
				</Row>
			</Column>
		);
	}
}

export function ShowChangeDisplayNameDialog(userID: string, oldDisplayName: string) {
	let firebase = store.firebase.helpers;

	let newDisplayName = oldDisplayName;

	let valid = true;
	let boxController: BoxController = ShowMessageBox({
		title: `Change display name`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = valid;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<Row>
						<Pre>Display name: </Pre>
						<TextInput value={newDisplayName} onChange={val=> {
							newDisplayName = val;
							boxController.UpdateUI();
						}}/>
					</Row>
				</Column>
			);
		},
		onOK: ()=> {
			new UpdateProfile({id: userID, updates: {displayName: newDisplayName}}).Run();
		}
	});
}
import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import {Column, Row, Pre, Button, TextInput} from "react-vcomponents";
import {Connect} from "Frame/Database/FirebaseConnect";
import {GetUser, GetUserID} from "Store/firebase/users";
import {User} from "../Store/firebase/users";
import { UpdateProfile } from "Server/Commands/UpdateProfile";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {ACTTopRightOpenPanelSet} from "../Store/main";

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
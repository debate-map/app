import {BaseComponent} from "../../../Frame/UI/ReactGlobals";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {HandleError} from "../../../Frame/General/Errors";
import Button from "../../../Frame/ReactComponents/Button";

@Connect(state=>({
	userPanelOpen: state.main.userPanelOpen,
	//authError: pathToJS(state.firebase, "authError"),
	auth: helpers.pathToJS(state.firebase, "auth"),
	//account: helpers.pathToJS(state.firebase, "profile")
}))
export default class UserPanel extends BaseComponent<{auth?}, {}> {
	render() {
		let {auth} = this.props;
		let firebase = store.firebase.helpers;
		return (
			<div style={{width: 300, height: 200, background: "rgba(0,0,0,.7)"}}>
				{auth &&
					<Button text="Sign out" onClick={()=> {
						firebase.logout();
					}}/>}
				{!auth && <SignInPanel/>}
			</div>
		);
	}
}

export class SignInPanel extends BaseComponent<{}, {}> {
	render() {
		let firebase = store.firebase.helpers;
		return (
			<div>
				<Button text="Google" onClick={async ()=> {
					try {
						let account = await firebase.login({provider: "google", type: "popup"});
					} catch (ex) {
						if (ex.message == "This operation has been cancelled due to another conflicting popup being opened.") return;
						HandleError(ex);
					}
				}}/>
				<Button text="Facebook" onClick={async ()=> {
					try {
						let account = await firebase.login({provider: "facebook", type: "popup"});
					} catch (ex) {
						if (ex.message == "This operation has been cancelled due to another conflicting popup being opened.") return;
						HandleError(ex);
					}
				}}/>
				<Button text="Twitter" onClick={async ()=> {
					try {
						let account = await firebase.login({provider: "twitter", type: "popup"});
					} catch (ex) {
						if (ex.message == "This operation has been cancelled due to another conflicting popup being opened.") return;
						HandleError(ex);
					}
				}}/>
				<Button text="Github" onClick={async ()=> {
					try {
						let account = await firebase.login({provider: "github", type: "popup"});
					} catch (ex) {
						if (ex.message == "This operation has been cancelled due to another conflicting popup being opened.") return;
						HandleError(ex);
					}
				}}/>
			</div>
		);
	}
}
import {ApplyBasicStyles, BaseComponent, BasicStyles, SimpleShouldUpdate} from "react-vextensions";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {HandleError} from "../../../Frame/General/Errors";
import {Button, Div, Row} from "react-vcomponents";
import {GetUserID} from "../../../Store/firebase/users";
import SocialButton from "react-social-button";
import {Column} from "react-vcomponents";
import {E} from "../../../Frame/General/Others";
import {ShowMessageBox, BoxController} from "react-vmessagebox";
import Link from "../../../Frame/ReactComponents/Link";
import {ACTSetPage, ACTTopRightOpenPanelSet} from "../../../Store/main";

@Connect(state=>({
	//authError: pathToJS(state.firebase, "authError"),
	//auth: helpers.pathToJS(state.firebase, "auth"),
	auth: State(a=>a.firebase.auth),
	//account: helpers.pathToJS(state.firebase, "profile")
}))
export default class UserPanel extends BaseComponent<{auth?}, {}> {
	render() {
		let {auth} = this.props;
		let firebase = store.firebase.helpers;
		if (!auth) {
			return (
				<Column style={{padding: 10, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
					<Div mt={-3} mb={5}>Takes under 30 seconds.</Div>
					<SignInPanel/>
				</Column>
			);
		}

		return (
			<Column style={{padding: 5, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
				<Column sel>
					<div>Name: {auth.displayName}</div>
					<div>ID: {GetUserID()}</div>
				</Column>
				{/*devEnv &&
					<Row>
						<CheckBox value={State().main.
					</Row>*/}
				<Row mt={5}>
					<Link ml="auto" mr={5} actions={d=>d(new ACTSetPage("profile"))} onContextMenu={e=>e.nativeEvent["passThrough"] = true}>
						<Button text="Edit profile" style={{width: 100}} onClick={()=> {
							store.dispatch(new ACTTopRightOpenPanelSet(null));
						}}/>
					</Link>
					<Button text="Sign out" style={{width: 100}} onClick={()=> {
						firebase.logout();
					}}/>
				</Row>
			</Column>
		);
	}
}

export function ShowSignInPopup() {
	let boxController: BoxController = ShowMessageBox({
		title: "Sign in", okButton: false, cancelOnOverlayClick: true,
		messageUI: ()=> {
			return (
				<div>
					<div>Takes under 30 seconds.</div>
					<SignInPanel style={{marginTop: 5}} onSignIn={()=>boxController.Close()}/>
				</div>
			);
		}
	});
}

@SimpleShouldUpdate
export class SignInPanel extends BaseComponent<{style?, onSignIn?: ()=>void}, {}> {
	render() {
		let {style, onSignIn} = this.props;
		return (
			<Column style={style}>
				<SignInButton provider="google" text="Sign in with Google" onSignIn={onSignIn}/>
				<SignInButton provider="facebook" text="Sign in with Facebook" mt={10} onSignIn={onSignIn}/>
				<SignInButton provider="twitter" text="Sign in with Twitter" mt={10} onSignIn={onSignIn}/>
				<SignInButton provider="github" text="Sign in with GitHub" mt={10} onSignIn={onSignIn}/>
			</Column>
		);
	}
}

@SimpleShouldUpdate
//@ApplyBasicStyles
class SignInButton extends BaseComponent<{provider: "google" | "facebook" | "twitter" | "github", text: string, style?, onSignIn?: ()=>void}, {loading: boolean}> {
	render() {
		let {provider, text, style, onSignIn} = this.props;
		let firebase = store.firebase.helpers;
		let {loading} = this.state;
		return (
			<SocialButton social={provider} text={text} loading={loading} btnProps={{
				style: E({outline: "none"}, BasicStyles(this.props), style),
				onClick: async ()=> {
					this.SetState({loading: true});
					try {
						let account = await firebase.login({provider, type: "popup"});
						if (this.mounted == false) return;
						this.SetState({loading: false});
						if (onSignIn) onSignIn();
					} catch (ex) {
						this.SetState({loading: false});
						if (ex.message == "This operation has been cancelled due to another conflicting popup being opened.") return;
						HandleError(ex);
					}
				}
			}}/>
		);
	}
}
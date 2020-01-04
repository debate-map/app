import {E} from "js-vextensions";
import {IsAuthValid} from "mobx-firelink";
import {Button, Column, Div, Row} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus, BasicStyles, SimpleShouldUpdate} from "react-vextensions";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {fire} from "Utils/LibIntegrations/MobXFirelink";
import {HandleError, Link, Observer} from "vwebapp-framework";
import {MeID} from "../../../Store/firebase/users";

@Observer
export class UserPanel extends BaseComponentPlus({}, {}) {
	render() {
		// authError: pathToJS(state.firebase, "authError"),
		// auth: helpers.pathToJS(state.firebase, "auth"),
		// const auth = State((a) => a.firebase.auth);
		// account: helpers.pathToJS(state.firebase, "profile")

		if (!IsAuthValid(fire.userInfo)) {
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
					<div>Name: {fire.userInfo.displayName}</div>
					<div>ID: {MeID()}</div>
				</Column>
				{/* DEV &&
					<Row>
						<CheckBox value={State().main.
					</Row> */}
				<Row mt={5}>
					<Link ml="auto" mr={5} onContextMenu={e=>e.nativeEvent["passThrough"] = true} actionFunc={s=>{
						s.main.page = "profile";
						s.main.topRightOpenPanel = null;
					}}>
						<Button text="Edit profile" style={{width: 100}}/>
					</Link>
					<Button ml={5} text="Sign out" style={{width: 100}} onClick={()=>{
						fire.LogOut();
					}}/>
				</Row>
			</Column>
		);
	}
}

export function ShowSignInPopup() {
	const boxController: BoxController = ShowMessageBox({
		title: "Sign in", okButton: false, cancelOnOverlayClick: true,
		message: ()=>{
			return (
				<div>
					<div>Takes under 30 seconds.</div>
					<SignInPanel style={{marginTop: 5}} onSignIn={()=>boxController.Close()}/>
				</div>
			);
		},
	});
}

@SimpleShouldUpdate
export class SignInPanel extends BaseComponent<{style?, onSignIn?: ()=>void}, {}> {
	render() {
		const {style, onSignIn} = this.props;
		return (
			<Column style={style}>
				<SignInButton provider="google" text="Sign in with Google" onSignIn={onSignIn}/>
				{/* <SignInButton provider="facebook" text="Sign in with Facebook" mt={10} onSignIn={onSignIn}/>
				<SignInButton provider="twitter" text="Sign in with Twitter" mt={10} onSignIn={onSignIn}/>
				<SignInButton provider="github" text="Sign in with GitHub" mt={10} onSignIn={onSignIn}/> */}
			</Column>
		);
	}
}

@SimpleShouldUpdate
// @ApplyBasicStyles
class SignInButton extends BaseComponent<{provider: "google" | "facebook" | "twitter" | "github", text: string, style?, onSignIn?: ()=>void}, {loading: boolean}> {
	render() {
		const {provider, text, style, onSignIn} = this.props;
		const {loading} = this.state;
		return (
			// <SocialButton social={provider} text={text} loading={loading} btnProps={{
			//	style: E({outline: "none"}, BasicStyles(this.props), style),
			//	onClick: async ()=> {
			<Button text={text} style={E({outline: "none"}, BasicStyles(this.props), style)} onClick={async()=>{
				this.SetState({loading: true});
				try {
					const account = await fire.LogIn({provider, type: "popup"});
					//const account = await store.firelink.LogIn({provider, type: "popup"});
					if (this.mounted == false) return;
					this.SetState({loading: false});
					if (onSignIn) onSignIn();
				} catch (ex) {
					this.SetState({loading: false});
					if (ex.message == "This operation has been cancelled due to another conflicting popup being opened.") return;
					HandleError(ex);
				}
			}}/>
		);
	}
}
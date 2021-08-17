import {E, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus, BasicStyles, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {HandleError, Link, Observer} from "web-vcore";
import {Me, MeID} from "dm_common";
import {graph} from "Utils/LibIntegrations/MobXGraphlink.js";
import {Assert} from "../../../../../../../../@Modules/web-vcore/Main/node_modules/react-vextensions/Dist/Internals/FromJSVE";
import {GetAppServerURL} from "Utils/LibIntegrations/Apollo";

@Observer
export class UserPanel extends BaseComponentPlus({}, {}) {
	render() {
		// authError: pathToJS(state.firebase, "authError"),
		// auth: helpers.pathToJS(state.firebase, "auth"),
		// const auth = State((a) => a.firebase.auth);
		// account: helpers.pathToJS(state.firebase, "profile")

		const user = Me();
		//if (graph.userInfo?.id == null) {
		if (user == null) {
			return (
				<Column style={{padding: 10, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
					<Div mt={-3} mb={5}>Takes under 30 seconds.</Div>
					<SignInPanel/>
				</Column>
			);
		}
		Assert(graph.userInfo?.id != null);

		return (
			<Column style={{padding: 5, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
				<Column sel>
					{/*<div>Name: {graph.userInfo.displayName}</div>*/}
					<div>Name: {Me()?.displayName ?? "n/a"}</div>
					<div>ID: {MeID()}</div>
				</Column>
				{/* DEV &&
					<Row>
						<CheckBox value={State().main.
					</Row> */}
				<Row mt={5}>
					<Link ml="auto" mr={5} onContextMenu={e=>e.nativeEvent["handled"] = true} actionFunc={s=>{
						s.main.page = "profile";
						s.main.topRightOpenPanel = null;
					}}>
						<Button text="Edit profile" style={{width: 100}}/>
					</Link>
					<Button ml={5} text="Sign out" style={{width: 100}} onClick={()=>{
						window.location.href = GetAppServerURL("/signOut");
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
				{/*<SignInButton provider="google" text="Sign in with Google" onSignIn={onSignIn}/>*/}
				{/*<div id="g_id_onload"
					data-client_id={googleClientID}
					//data-login_uri="https://your.domain/your_login_endpoint"
					data-callback="handleCredentialResponse"
					data-auto_prompt="false">
				</div>
				<div className="g_id_signin"
					data-type="standard"
					data-size="large"
					data-theme="outline"
					data-text="sign_in_with"
					data-shape="rectangular"
					data-logo_alignment="left">
				</div>*/}
				<div ref={c=>{
					if (!c) return;
					if (g.google == null) WaitXThenRun(100, ()=>this.Update()); // wait until google-id api is loaded
					EnsureGoogleIDAPIReady();

					const options: GsiButtonConfiguration = {};
					//g.google.accounts.id.renderButton(c, options);
					g.google.accounts.id.renderButton(c, options, ()=>{
						// rather than using client-side retrieval of access-token, use server-side retrieval (it's safer)
						//window.location.href = `${window.location.origin}/auth/google`;
						window.location.href = GetAppServerURL("/auth/google");
						// todo: make client-side retrieval of access-token impossible (so if frontend gets hacked, code can't trick user into providing access-token)
						// todo: make sure the access-token data that server retrieves is never made accessible to frontend code (eg. use cookies, and set to http-only)
						// todo: make this sign-in flow not require our main page to redirect (instead use a new-tab or popup-window)
					});
				}}/>
				{/* <SignInButton provider="facebook" text="Sign in with Facebook" mt={10} onSignIn={onSignIn}/>
				<SignInButton provider="twitter" text="Sign in with Twitter" mt={10} onSignIn={onSignIn}/>
				<SignInButton provider="github" text="Sign in with GitHub" mt={10} onSignIn={onSignIn}/> */}
			</Column>
		);
	}
}

// from: https://developers.google.com/identity/gsi/web/reference/js-reference
type GsiButtonConfiguration = {
	type?: string; // The button type: icon, or standard button.
	theme?: string; // The button theme. For example, white or blue.
	size?: string; // The button size. For example, samll or large.
	text?: string; // The button text. For example, "Sign in with Google" or "Sign up with Google".
	shape?: string; // The button shape. For example, rectangular or circular.
	logo_alignment?: string; // The Google logo alignment: left or center.
	width?: number; // The button width, in pixels.
	locale?: string; // If set, then the button language is rendered.
}
export const googleClientID = process.env.CLIENT_ID; // supplied by NPMPatches.ts
export function EnsureGoogleIDAPIReady() {
	if (g.google.accounts.id._initCalled) return;
	g.google.accounts.id.initialize({
      client_id: googleClientID,
      callback: googleID_handleCredentialResponse,
	});
	g.google.accounts.id._initCalled = true;
}
export type GoogleID_CredentialResponse = {clientId: string, credential: string, select_by: "string"};
export const googleID_handleCredentialResponse = async(response: GoogleID_CredentialResponse)=>{
	console.log("Data:", response);
	await fetch(GetAppServerURL("/auth/google/callback"), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			idToken: response.credential,
		}),
	});
};

/*@SimpleShouldUpdate
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
					const account = await graph.LogIn(/*{provider, type: "popup"}*#/);
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
}*/
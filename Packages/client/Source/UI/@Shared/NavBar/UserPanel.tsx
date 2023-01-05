import {Assert, E, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, Div, Row, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus, BasicStyles, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ES, GetCurrentURL, InfoButton, Link, Observer} from "web-vcore";
import {Me, MeID} from "dm_common";
import {graph} from "Utils/LibIntegrations/MobXGraphlink.js";
import {apolloClient, GetAppServerURL} from "Utils/LibIntegrations/Apollo";
import {liveSkin} from "Utils/Styles/SkinManager";
import React from "react";
import {FetchResult, gql} from "web-vcore/nm/@apollo/client";
import {OnUserJWTChanged} from "Utils/AutoRuns/UserInfoCheck";

@Observer
export class UserPanel extends BaseComponentPlus({}, {}) {
	render() {
		const user = Me();
		//if (graph.userInfo?.id == null) {
		if (user == null) {
			return (
				<Column style={{
					padding: 10, borderRadius: "0 0 0 5px",
					background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
				}}>
					<Div mt={-3} mb={5}>Takes under 30 seconds.</Div>
					<SignInPanel/>
				</Column>
			);
		}
		Assert(graph.userInfo?.id != null);

		return (
			<Column style={{
				padding: 5, borderRadius: "0 0 0 5px",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				<Column sel>
					{/*<div>Name: {graph.userInfo.displayName}</div>*/}
					<div>Name: {Me()?.displayName ?? "n/a"}</div>
					<div>ID: {MeID()}</div>
				</Column>
				<Row mt={5}>
					<Link ml="auto" mr={5} onContextMenu={e=>e.nativeEvent["handled"] = true} actionFunc={s=>{
						s.main.page = "profile";
						s.main.topRightOpenPanel = null;
					}}>
						<Button text="Edit profile" style={{width: 110}} />
					</Link>
					<Button ml={5} text="Sign out" style={{width: 110}} onClick={()=>{
						localStorage.removeItem("debate-map-user-jwt");
						OnUserJWTChanged();
					}} />
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
export class SignInPanel extends BaseComponent<{style?, onSignIn?: ()=>void}, {username: string}> {
	static initialState = {username: "Dev1"};
	render() {
		const {style, onSignIn} = this.props;
		const {username} = this.state;
		return (
			<Column style={ES(style)}>
				{/*<SignInButton provider="google" text="Sign in with Google" onSignIn={onSignIn}/>*/}
				<div ref={c=>{
					if (!c) return;
					if (g.google == null) {
						WaitXThenRun(100, ()=>this.Update()); // wait until google-id api is loaded
						return;
					}
					EnsureGoogleIDAPIReady();

					const options: GsiButtonConfiguration = {};
					//g.google.accounts.id.renderButton(c, options);
					g.google.accounts.id.renderButton(c, options, async()=>{
						await DoSignInFlow("google");
					});
				}}/>
				{/*<SignInButton provider="facebook" text="Sign in with Facebook" mt={10} onSignIn={onSignIn}/>
				<SignInButton provider="twitter" text="Sign in with Twitter" mt={10} onSignIn={onSignIn}/>
				<SignInButton provider="github" text="Sign in with GitHub" mt={10} onSignIn={onSignIn}/>*/}

				{g.DB == "dev" &&
				<Column style={{width: 300}}>
					<Row mt={6} pt={3} style={{display: "block", borderTop: "2px solid gray"}}>
						{`You're connected to a dev-mode server, where fake/passwordless sign-in is used.`}
						<InfoButton ml={5} text={`
							Google sign-in can work in dev-mode, but only if you fill out the "CLIENT_ID" and "CLIENT_SECRET" vars in the root .env file before building/deploying the app-server pod.
							(also, I may remove the ability to use Google sign-in in dev-mode later on, since having it active requires adding localhost entries to the client registration, which might have drawbacks)
						`.AsMultiline(0)}/>
					</Row>
					<Row>
						<Text>Username:</Text>
						<TextInput ml={5} style={{flex: 1}} value={username} onChange={val=>this.SetState({username: val})}/>
						<Button ml={5} text="Sign in" onClick={async()=>{
							await DoSignInFlow("dev", username);
						}}/>
					</Row>
				</Column>}
			</Column>
		);
	}
}

async function DoSignInFlow(provider: "google" | "dev", username?: string) {
	const monthInSecs = 2629800;
	//const monthInSecs = GetCurrentURL().GetQueryVar("test1")?.ToInt() ?? 2629800;
	const fetchResult_subscription = apolloClient.subscribe({
		query: gql`
			subscription($input: SignInStartInput!) {
				signInStart(input: $input) {
					instructions
					authLink
					resultJWT
				}
			}
		`,
		variables: {input: {provider, jwtDuration: monthInSecs, preferredUsername: username}},
	});
	let popupOpened = false;
	const resultJWT = await new Promise<string>(resolve=>{
		const subscription = fetchResult_subscription.subscribe(data=>{
			if (data.data.signInStart.authLink && !popupOpened) {
				popupOpened = true;
				OpenSignInPopup(data.data.signInStart.authLink);
			}

			if (data.data.signInStart.resultJWT) {
				subscription.unsubscribe(); // unsubscribe as soon as first (and only) result is received
				resolve(data.data.signInStart.resultJWT);
			}
		});
	});

	// store jwt in local-storage
	localStorage.setItem("debate-map-user-jwt", resultJWT);
	OnUserJWTChanged();
}

function OpenSignInPopup(url: string) {
	const name = "sign_in_popup";

	//const specs = "width=500,height=500";
	//var width = 500, height = 370;
	var width = 470, height = 580;
	var w = window.outerWidth - width, h = window.outerHeight - height;
	var left = Math.round(window.screenX + (w / 2));
	var top = Math.round(window.screenY + (h / 2.5));
	const specs = `width=${width},height=${height},left=${left},top=${top},toolbar=0,scrollbars=0,status=0,resizable=0,location=0,menuBar=0`;

	window.open(url, name, specs);
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
export const googleClientID = process.env.CLIENT_ID; // supplied by ./Scripts/Config.js
export function EnsureGoogleIDAPIReady() {
	/*if (g.google == null) {
		console.error("Cannot initialize Google ID api, because its script has not been loaded.");
		return;
	}*/

	if (g.google.accounts.id._initCalled) return;
	/*const googleClientID_randomPart = googleClientID?.replace(".apps.googleusercontent.com", "");
	console.log("GClientID:", `${googleClientID_randomPart?.slice(0, 2)}...${googleClientID_randomPart?.slice(-2)}`);*/
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
import {BaseComponent} from "react-vextensions";
import {WaitXThenRun} from "js-vextensions";
import {gql, useQuery, useSubscription} from "@apollo/client";
import {Button} from "react-vcomponents";
import {GetAppServerURL} from "../../../../Utils/LibIntegrations/Apollo.js";
import {OpenSignInPopup, SignInProvider} from "../UserPanel.js";

export class SignInButton extends BaseComponent<{provider: SignInProvider, preferredUsername?: string, onJWTReceived: (jwt: string)=>void}, {authLink: string, devSignInButtonClicked: boolean, jwtResolved: boolean}> {
	render() {
		const {provider, preferredUsername, onJWTReceived} = this.props;
		const {devSignInButtonClicked, jwtResolved} = this.state;

		const subActive = provider == "dev"
			// for "dev" provider, we cannot even start the sign-in subscription until the user clicks the button (since it immediately returns a jwt, rather than a link to click)
			? devSignInButtonClicked && !jwtResolved
			: !jwtResolved;

		// todo: may want to handle possible edge-case of auth-link "expiring", requiring retrieval of a new one (ie. starting a new subscription)
		const monthInSecs = 2629800; // 60 * 60 * 24 * 30;
		useSubscription(gql`
			subscription($input: SignInStartInput!) {
				signInStart(input: $input) { instructions authLink resultJWT }
			}
		`, {
			skip: !subActive,
			variables: {input: {provider, jwtDuration: monthInSecs, preferredUsername}},
			onData: info=>{
				const gqlResult = info.data.data.signInStart;
				if (gqlResult.authLink) {
					this.SetState({authLink: gqlResult.authLink});
				}

				if (gqlResult.resultJWT) {
					//subscription.unsubscribe(); // unsubscribe as soon as first (and only) result is received
					this.SetState({jwtResolved: true}); // by setting jwtResolved to true, we disable the subscription and clear this comp's ui contents (comp will be unmounted soon when replaced with user information)
					onJWTReceived(gqlResult.resultJWT);
				}
			},
		});

		return <>
			{provider == "google" && <SignInButton_Google_Inner onClick={this.Google_OnClick}/>}
			{provider == "dev" && <Button ml={5} text="Sign in" onClick={()=>this.SetState({devSignInButtonClicked: true})}/>}
		</>;
	}
	//popupOpened = false;
	// anchor this function to the class-instance, so that it doesn't change between re-renders
	Google_OnClick = ()=>{
		const {provider} = this.props;
		const {authLink, jwtResolved} = this.state;
		// Why not block popup-relaunch if was already launched? Because user may have closed the popup, but then decided to try again.
		if (authLink != null && !jwtResolved) {
			OpenSignInPopup(authLink, provider);
		}
	};
}

class SignInButton_Google_Inner extends BaseComponent<{onClick: ()=>any}, {}> {
	render() {
		const {onClick} = this.props;
		return (
			<div ref={c=>{
				if (!c) return;
				if (g.google == null) {
					WaitXThenRun(100, ()=>this.Update()); // wait until google-id api is loaded
					return;
				}
				EnsureGoogleIDAPIReady();

				const options: GsiButtonConfiguration = {};
				//g.google.accounts.id.renderButton(c, options);
				g.google.accounts.id.renderButton(c, options, onClick);
			}}/>
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
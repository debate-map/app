import {BaseComponent} from "react-vextensions";
import React, {useReducer} from "react";
import {WaitXThenRun} from "js-vextensions";
import {gql, useSubscription} from "@apollo/client";
import {Button} from "react-vcomponents";
import {GetAppServerURL} from "../../../../Utils/LibIntegrations/Apollo.js";
import {OpenSignInPopup, SignInProvider} from "../UserPanel.js";
import {observer_mgl} from "mobx-graphlink";
import {useCallback, useState} from "react";

type SignInButtonProps = {
	provider: SignInProvider;
	preferredUsername?: string;
	onJWTReceived: (jwt: string) => void;
}

export const SignInButton = observer_mgl<SignInButtonProps>(({
	provider,
	preferredUsername,
	onJWTReceived
})=>{
	const [devSignInButtonClicked, setDevSignInButtonClicked] = useState<boolean>(false);
	const [jwtResolved, setJwtResolved] = useState<boolean>(false);
	const [authLink, setAuthLink] = useState<string | null>();

	// for "dev" provider, we cannot even start the sign-in subscription until the user clicks the button (since it immediately returns a jwt, rather than a link to click)
	const subActive = provider == "dev" ? devSignInButtonClicked && !jwtResolved : !jwtResolved;
	// TODO: may want to handle possible edge-case of auth-link "expiring", requiring retrieval of a new one (ie. starting a new subscription)
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
				setAuthLink(gqlResult.authLink);
			}
			if (gqlResult.resultJWT) {
				//subscription.unsubscribe(); // unsubscribe as soon as first (and only) result is received
				setJwtResolved(true); // by setting jwtResolved to true, we disable the subscription and clear this comp's ui contents (comp will be unmounted soon when replaced with user information)
				onJWTReceived(gqlResult.resultJWT);
			}
		},
	});

	const handleGoogleOnClick = useCallback(()=>{
		// Why not block popup-relaunch if was already launched? Because user may have closed the popup, but then decided to try again.
		if (authLink != null && !jwtResolved) {
			OpenSignInPopup(authLink, provider);
		}
	}, [authLink, jwtResolved, provider]);

	const handleDevSignInClick = ()=>{
		setDevSignInButtonClicked(true);
	}

	return <>
		{provider == "google" && <SignInButton_Google_Inner onClick={handleGoogleOnClick}/>}
		{provider == "dev" && <Button ml={5} text="Sign in" onClick={handleDevSignInClick}/>}
	</>;
})

export const SignInButton_Google_Inner= ({onClick}: {onClick: ()=>any})=>{
	const [_, reRender] = useReducer(x=>x+1, 0);
	return (
		<div ref={c=>{
			if (!c) return;
			if (g.google == null) {
				WaitXThenRun(100, ()=>reRender()); // wait until google-id api is loaded
				return;
			}
			EnsureGoogleIDAPIReady();

			const options: GsiButtonConfiguration = {};
			g.google.accounts.id.renderButton(c, options, onClick);
		}}/>
	);
};

/**
 * Configuration options for rendering a Google Sign-In button.
 * Reference: https://developers.google.com/identity/gsi/web/reference/js-reference
 */
type GsiButtonConfiguration = {
    /** The button type: `"icon"` or `"standard"`. */
    type?: string;
    /** The button theme: e.g., `"white"`, `"blue"`. */
    theme?: string;
    /** The button size: e.g., `"small"`, `"large"`. */
    size?: string;
    /** The button text: e.g., `"Sign in with Google"`, `"Sign up with Google"`. */
    text?: string;
    /** The button shape: e.g., `"rectangular"`, `"circular"`. */
    shape?: string;
    /** The Google logo alignment: `"left"` or `"center"`. */
    logo_alignment?: string;
    /** The button width in pixels. */
    width?: number;
    /** The button language/locale code, e.g., `"en"`, `"fr"`. */
    locale?: string;
};

export const googleClientID = process.env.CLIENT_ID; // supplied by client/rspack.config.js
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

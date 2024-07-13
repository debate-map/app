import {Assert, E, WaitXThenRun} from "js-vextensions";
import {Button, Column, Div, Row, Text, TextInput} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus, BasicStyles, SimpleShouldUpdate} from "react-vextensions";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {AddNotificationMessage, ES, GetCurrentURL, InfoButton, Link, Observer} from "web-vcore";
import {Me, MeID} from "dm_common";
import {graph} from "Utils/LibIntegrations/MobXGraphlink.js";
import {apolloClient, GetAppServerURL} from "Utils/LibIntegrations/Apollo";
import {liveSkin} from "Utils/Styles/SkinManager";
import React from "react";
import {FetchResult, gql} from "@apollo/client";
import {OnUserJWTChanged} from "Utils/AutoRuns/UserInfoCheck";
import {SignInButton} from "./UserPanel/SignInButton.js";

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
export class SignInPanel extends BaseComponent<{style?, onSignIn?: ()=>void}, {dev_username: string}> {
	static initialState = {dev_username: "Dev1"};
	render() {
		const {style, onSignIn} = this.props;
		const {dev_username} = this.state;

		const onJWTReceived = (jwt: string)=>{
			// store jwt in local-storage
			localStorage.setItem("debate-map-user-jwt", jwt);
			OnUserJWTChanged();
			onSignIn?.();
		};

		return (
			<Column style={ES(style)}>
				<SignInButton provider="google" onJWTReceived={onJWTReceived}/>
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
						<TextInput ml={5} style={{flex: 1}} value={dev_username} onChange={val=>this.SetState({dev_username: val})}/>
						<SignInButton provider="dev" preferredUsername={dev_username} onJWTReceived={onJWTReceived}/>
					</Row>
				</Column>}
			</Column>
		);
	}
}

export type SignInProvider = "google" | "dev";

export function OpenSignInPopup(url: string, provider: SignInProvider) {
	const name = "sign_in_popup";

	let size: {width: number, height: number};
	if (provider == "google") size = {width: 470, height: 580};
	else return; // "dev" sign-in doesn't use popups

	var w = window.outerWidth - size.width, h = window.outerHeight - size.height;
	var left = Math.round(window.screenX + (w / 2));
	var top = Math.round(window.screenY + (h / 2.5));
	const specs = `width=${size.width},height=${size.height},left=${left},top=${top},toolbar=0,scrollbars=0,status=0,resizable=0,location=0,menuBar=0`;

	const popupWindow = window.open(url, name, specs);
	if (WasPopupWindowBlocked(popupWindow)) {
		// commented; popup-blockers (on firefox anyway) block these new-tab attempts as well
		//window.open(url, "_blank");

		AddNotificationMessage(`
			Popup for sign-in was blocked; please allow popups for this site, or manually open the sign-in link in a new tab.
			
			Sign-in link: ${url}
		`);
	}
}

function WasPopupWindowBlocked(popupWindow: Window|null) {
	if (popupWindow == null) return true;
	if (popupWindow.closed) return true;
	// maybe needed for safari (not yet checked, but suggested by: https://stackoverflow.com/questions/2914#comment137165479_27725432)
	/*try {
		popupWindow.focus();
	} catch (e) {
		return true;
	}*/
	return false;
}
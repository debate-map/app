import {Dispatch} from "redux";
import {Component, PropTypes} from "react";
import {Link} from "react-router";
import AppBar from "material-ui/AppBar";
import IconMenu from "material-ui/IconMenu";
import IconButton from "material-ui/IconButton";
import MenuItem from "material-ui/MenuItem";
import FlatButton from "material-ui/FlatButton";
import Avatar from "material-ui/Avatar";
import GoogleButton from 'react-google-button';

import {connect} from "react-redux";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {BaseComponent, RowLR} from "../Frame/UI/ReactGlobals";
import {Debugger} from "../Frame/General/Globals_Free";
import Button from "../Frame/ReactComponents/Button";
import TextInput from "../Frame/ReactComponents/TextInput";
const {pathToJS} = helpers;

// actions
// ==========

export var SET_USER_PANEL_OPEN = "SET_USER_PANEL_OPEN";
export function SetUserPanelOpen(open) {
	return {
		type: SET_USER_PANEL_OPEN,
		payload: open
	};
}

// main
// ==========

const originSettings = {horizontal: "right", vertical: "top"};
const buttonStyle = {color: "white", textDecoration: "none"};
const avatarSize = 50;

const avatarStyles = {
	icon: {width: avatarSize, height: avatarSize},
	button: {marginRight: "1.5rem", width: avatarSize, height: avatarSize},
	wrapper: {marginTop: 45 - avatarSize}
};

@firebaseConnect()
@(connect(state=>({
	page: state.page,
	userPanelOpen: state.main.userPanelOpen,
	auth: pathToJS(state.firebase, "auth"),
})) as any)
export default class Navbar extends BaseComponent<{dispatch?, page?, userPanelOpen?, auth?}, {}> {
	render() {
		let {page, userPanelOpen, auth, dispatch} = this.props;
		return (
			<div id="topMenu"
					style={{
						padding: "0 10px", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
						//background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
						background: "rgba(0,0,0,1)",
					}}>
				<div style={{textAlign: "center"}}>
					<span style={{display: "inline-block", paddingLeft: 40}}>
						<NavBarButton page="community" text="Community" active={page == "community"}/>
						<NavBarButton page="forum" text="Forum" active={page == "forum"}/>
						<NavBarButton page="terms" text="Terms" active={page == "terms"}/>
						<Link to="/" style={{
							display: "inline-block", margin: "0 auto", cursor: "pointer", verticalAlign: "middle",
							lineHeight: "45px", textAlign: "center", color: "#FFF", padding: "0 15px",
							textDecoration: "none", opacity: .9, fontSize: 23
						}}>
							Debate Map
						</Link>
						<NavBarButton page="global-map" text="Global Map" active={page == "global-map"}/>
						<NavBarButton page="debate-maps" text="Debate Maps" active={page == "debate-maps"}/>
						<NavBarButton page="personal-maps" text="Personal Maps" active={page == "personal-maps"}/>
					</span>
					<span style={{position: "absolute", right: 0}}>
						<div className="transition500 opacity100OnHover"
							style={{
								display: "inline-block", padding: 0, width: 40, height: 40,
								backgroundImage: "url(/Images/Buttons/PageOptions.png)", backgroundRepeat: "no-repeat",
								backgroundPosition: "center center", backgroundSize: 30, opacity: .75, cursor: "pointer"}}
							onClick={()=>{}}/>
						<div className="transition500 opacity100OnHover"
							style={{
								display: "inline-block", padding: 0, width: 40, height: 40,
								backgroundImage: `url(${auth ? auth.photoURL : "/Images/Buttons/User.png"})`, backgroundRepeat: "no-repeat",
								backgroundPosition: "center center", backgroundSize: 30, opacity: .75, cursor: "pointer"}}
							onClick={()=> {
								dispatch(SetUserPanelOpen(!userPanelOpen));
							}}/>
					</span>
					<div style={{position: "absolute", zIndex: 11, right: 0}}>
						{userPanelOpen &&
							<UserPanel/>}
					</div>
				</div>
			</div>
		);
	}
}

@firebaseConnect()
@(connect(state=>({
	page: state.page,
	userPanelOpen: state.main.userPanelOpen,
	//authError: pathToJS(state.firebase, "authError"),
	auth: pathToJS(state.firebase, "auth"),
	account: pathToJS(state.firebase, "profile")
})) as any)
class UserPanel extends BaseComponent<{firebase?, auth?, account?}, {}> {
	static contextTypes = {
		router: PropTypes.object.isRequired
	};
	render() {
		let {firebase, auth, account} = this.props;
		let {router} = this.context;
		return (
			<div style={{width: 300, height: 200, background: "rgba(0,0,0,.7)"}}>
				{auth
					? <Button text="Sign out" onClick={()=> {
						firebase.logout();
					}}/>
					: <div>
						<GoogleButton onClick={async ()=> {
							let account = await firebase.login({provider: "google", type: "popup"});
						}}/>
					</div>}
			</div>
		);
	}
}

class NavBarButton extends BaseComponent<{page, text, active}, {}> {
	render() {
		var {page, text, active} = this.props;
		return (
			<Link className="unselectable"
					style={{
						display: "inline-block", cursor: "pointer", verticalAlign: "middle",
						lineHeight: "45px", color: "#FFF", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: .9
					}}
					to={page}>
				{text}
			</Link>
		);
	}
}
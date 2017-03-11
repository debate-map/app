import {styles, colors} from "../Frame/UI/GlobalStyles";
import {Dispatch} from "redux";
import {Component, PropTypes} from "react";
import {Link} from "react-router-dom";
import AppBar from "material-ui/AppBar";
import IconMenu from "material-ui/IconMenu";
import IconButton from "material-ui/IconButton";
import MenuItem from "material-ui/MenuItem";
import FlatButton from "material-ui/FlatButton";
import Avatar from "material-ui/Avatar";
import GoogleButton from 'react-google-button';

import {connect} from "react-redux";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {BaseComponent, RowLR, BaseProps} from "../Frame/UI/ReactGlobals";
import {Debugger} from "../Frame/General/Globals_Free";
import Button from "../Frame/ReactComponents/Button";
import TextInput from "../Frame/ReactComponents/TextInput";
import Action from "../Frame/General/Action";
const {pathToJS} = helpers;

// actions
// ==========

export class ACTSetUserPanelOpen extends Action<boolean> {}

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
						padding: "0 10px", boxShadow: colors.navBarBoxShadow,
						//background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
						background: "rgba(0,0,0,1)", zIndex: 1,
					}}>
				<div style={{textAlign: "center"}}>
					<span style={{display: "inline-block", paddingLeft: 5}}>
						<NavBarButton to="/forum" text="Forum"/>
						<NavBarButton to="/community" text="Community"/>
						<NavBarButton to="/search" text="Search"/>
						<NavBarButton to="/more/admin" text="More"/>
						<Link to="/" style={{
							display: "inline-block", margin: "0 auto", cursor: "pointer", verticalAlign: "middle",
							lineHeight: "45px", textAlign: "center", color: "#FFF", padding: "0 15px",
							textDecoration: "none", opacity: .9, fontSize: 23
						}}>
							Debate Map
						</Link>
						<NavBarButton to="/terms" text="Terms"/>
						<NavBarButton to="/personal" text="Personal"/>
						<NavBarButton to="/debates" text="Debates"/>
						<NavBarButton to="/global/map" text="Global"/>
					</span>
					<span style={{position: "absolute", right: 0}}>
						<div className="transition500 opacity100OnHover"
							style={{
								display: "inline-block", padding: 0, width: 40, height: 45,
								backgroundImage: "url(/Images/Buttons/PageOptions.png)", backgroundRepeat: "no-repeat",
								backgroundPosition: "center center", backgroundSize: 30, opacity: .75, cursor: "pointer"}}
							onClick={()=>{}}/>
						<div className="transition500 opacity100OnHover"
							style={{
								display: "inline-block", padding: 0, width: 40, height: 45,
								backgroundImage: `url(${auth ? auth.photoURL : "/Images/Buttons/User.png"})`, backgroundRepeat: "no-repeat",
								backgroundPosition: "center center", backgroundSize: 30, opacity: .75, cursor: "pointer"}}
							onClick={()=> {
								dispatch(new ACTSetUserPanelOpen(!userPanelOpen));
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

export class NavBarButton extends BaseComponent<{to, text} & BaseProps, {}> {
	render() {
		var {to, text, page} = this.props;
		let active = to == page;
		return (
			<Link to={to} style={{
				display: "inline-block", cursor: "pointer", verticalAlign: "middle",
				lineHeight: "45px", color: "#FFF", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: .9
			}}>
				{text}
			</Link>
		);
	}
}
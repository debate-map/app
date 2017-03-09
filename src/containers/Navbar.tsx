import {Dispatch} from "redux";
import {Component, PropTypes} from "react";
import {Link} from "react-router";
import AppBar from "material-ui/AppBar";
import IconMenu from "material-ui/IconMenu";
import IconButton from "material-ui/IconButton";
import MenuItem from "material-ui/MenuItem";
import FlatButton from "material-ui/FlatButton";
import Avatar from "material-ui/Avatar";

import {connect} from "react-redux";
import {firebase, helpers} from "react-redux-firebase";
import {BaseComponent} from "../Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import {Debugger} from "../Frame/General/Globals_Free";
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

@firebase()
@(connect(state=>({
	page: state.page,
	userPanelOpen: state.main.userPanelOpen,
	authError: pathToJS(state.firebase, "authError"),
	auth: pathToJS(state.firebase, "auth"),
	account: pathToJS(state.firebase, "profile")
})) as any)
export default class Navbar extends BaseComponent<{firebase?, authError?, auth?, account?, page?, userPanelOpen?, dispatch?}, {}> {
	/*static contextTypes = {
		store: PropTypes.object.isRequired
	};*/

	/*handleLogout() {
		this.props.firebase.logout();
		this.context.router.push("/");
	}*/

	/*render() {
		const {auth} = this.props;

		const iconButton = (
			<IconButton iconStyle={avatarStyles.icon} style={avatarStyles.button}>
				<Avatar src={auth && auth.photoURL ? auth.photoURL : StockPhoto}/>
			</IconButton>
		);

		const mainMenu = (
			<div>
				<Link to={SIGNUP_PATH}>
					<FlatButton label="Sign Up" style={buttonStyle}/>
				</Link>
				<Link to={LOGIN_PATH}>
					<FlatButton label="Login" style={buttonStyle}/>
				</Link>
			</div>
		);

		const rightMenu = auth ? (
			<IconMenu iconButtonElement={iconButton}
					targetOrigin={{horizontal: "right", vertical: "bottom"}}
					anchorOrigin={originSettings} animated={false}>
				<MenuItem primaryText="Account" value="account"
					onTouchTap={()=> this.context.router.push(ACCOUNT_PATH)}/>
				<MenuItem primaryText="Sign out" value="logout" onTouchTap={this.handleLogout}/>
			</IconMenu>
		) : mainMenu;

		// Only apply styling if avatar is showing
		const menuStyle = auth ? avatarStyles.wrapper : {};

		// Redirect to projects page if logged in
		const brandPath = auth ? `/${LIST_PATH}` : "/";

		return (
			<AppBar
				title={
					<Link to={brandPath}>
						Thesis Map
					</Link>
				}
				showMenuIconButton={false}
				iconElementRight={rightMenu}
				iconStyleRight={menuStyle}
			/>
		);
	}*/

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
				</div>
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
					to={page}
					/*onClick={e=> {
						if (!e.ctrlKey)
							e.preventDefault();
						// todo
					}}*/>
				{text}
			</Link>
		);
	}
}
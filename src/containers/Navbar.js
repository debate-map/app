import React, {Component, PropTypes} from "react";
import {Link} from "react-router";
import {
	LIST_PATH,
	ACCOUNT_PATH,
	LOGIN_PATH,
	SIGNUP_PATH
} from "constants/paths";

// Components
import AppBar from "material-ui/AppBar";
import IconMenu from "material-ui/IconMenu";
import IconButton from "material-ui/IconButton";
import MenuItem from "material-ui/MenuItem";
import FlatButton from "material-ui/FlatButton";
import Avatar from "material-ui/Avatar";
import StockPhoto from "static/User.png";

const originSettings = {horizontal: "right", vertical: "top"};
const buttonStyle = {color: "white", textDecoration: "none"};
const avatarSize = 50;

const avatarStyles = {
	icon: {width: avatarSize, height: avatarSize},
	button: {marginRight: "1.5rem", width: avatarSize, height: avatarSize},
	wrapper: {marginTop: 45 - avatarSize}
};

import {connect} from "react-redux";
import {firebase, helpers} from "react-redux-firebase";
const {pathToJS} = helpers;

// Props decorators
@firebase()
@connect(({firebase})=>({
	authError: pathToJS(firebase, "authError"),
	auth: pathToJS(firebase, "auth"),
	account: pathToJS(firebase, "profile")
}))
export default class Navbar extends Component {
	static contextTypes = {
		router: PropTypes.object.isRequired
	};
	static propTypes = {
		auth: PropTypes.object,
		firebase: PropTypes.object.isRequired
	};

	handleLogout() {
		this.props.firebase.logout();
		this.context.router.push("/");
	}

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
		var {store} = this.context;
		var {page} = store || {};
		return (
			<div id="topMenu"
					style={{
						padding: "0 10px", background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
						height: 40, borderRadius: 3, boxShadow: "3px 3px 7px rgba(0,0,0,.07)"
					}}>
				<a className="unselectable"
						style={{
							display: "inline-block", cursor: "pointer", verticalAlign: "middle",
							lineHeight: "40px", color: "#FFF", padding: "0 15px", fontSize: 12,
							textDecoration: "none", opacity: .9, fontSize: 20
						}}
						onClick={()=>{
							// todo: navigate to home
						}}>
					Thesis Map
				</a>
				<NavBarButton page="" text="Home" active={page == ""}/>
				<NavBarButton page="community" text="Community" active={page == "community"}/>
				<NavBarButton page="forum" text="Forum" active={page == "forum"}/>
				<NavBarButton page="definitions" text="Definitions" active={page == "definitions"}/>
				<NavBarButton page="global-map" text="Global Map" active={page == "global-map"}/>
				<NavBarButton page="discussion-maps" text="Discussion Maps" active={page == "discussion-maps"}/>
				<NavBarButton page="personal-maps" text="Personal Maps" active={page == "personal-maps"}/>

				<div className="unselectable quickMenuToggler transition500 opacity100OnHover"
					style={{
						float: "right", padding: 0, width: 40, height: 40,
						background: "url('/Images/Buttons/User.png') no-repeat 5px 5px",
						backgroundSize: 30, marginRight: -10, opacity: .75, cursor: "pointer"}}
					onClick={()=>{}}/>
				<div className="unselectable quickMenuToggler transition500 opacity100OnHover"
					style={{
						float: "right", padding: 0, width: 40, height: 40,
						background: "url('/Images/Buttons/PageOptions.png') no-repeat 5px 5px",
						backgroundSize: 30, marginRight: -5, opacity: .75, cursor: "pointer"}}
					onClick={()=>{}}/>
			</div>
		);
	}
}

class NavBarButton extends Component {
	render() {
		var {page, text, active} = this.props;
		return (
			<a className="unselectable"
					style={{
						display: "inline-block", cursor: "pointer", verticalAlign: "middle",
						lineHeight: "40px", color: "#FFF", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: .9
					}}
					onClick={()=> {
						// todo: navigate to page
					}}>
				{text}
			</a>
		);
	}
}
import {styles, colors} from "../../Frame/UI/GlobalStyles";
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
import {BaseComponent, BaseProps} from "../../Frame/UI/ReactGlobals";
import {Debugger} from "../../Frame/General/Globals_Free";
import Button from "../../Frame/ReactComponents/Button";
import TextInput from "../../Frame/ReactComponents/TextInput";
import Action from "../../Frame/General/Action";
import {HandleError} from "../../Frame/General/Errors";
import UserPanel from "./Navbar/UserPanel";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {ACTTopRightOpenPanelSet, ACTTopLeftOpenPanelSet} from "../../Store/main";
import ChatPanel from "./Navbar/ChatPanel";
import StreamPanel from "./Navbar/StreamPanel";
import SearchPanel from "./Navbar/SearchPanel";
import {SubNavBarButton} from "./SubNavbar";

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

@Connect(state=>({
	topLeftOpenPanel: state.main.topLeftOpenPanel,
	topRightOpenPanel: state.main.topRightOpenPanel,
	auth: helpers.pathToJS(state.firebase, "auth"),
}))
export default class Navbar extends BaseComponent<{dispatch?, page?, topLeftOpenPanel?, topRightOpenPanel?, auth?: firebase.User}, {}> {
	static contextTypes = {store: PropTypes.object.isRequired};
	render() {
		let {topLeftOpenPanel, topRightOpenPanel, auth} = this.props;
		let {dispatch} = this.context.store;
		return (
			<div style={{
				padding: "0 10px", boxShadow: colors.navBarBoxShadow,
				//background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
				background: "rgba(0,0,0,1)", zIndex: 11,
			}}>
				<div style={{display: "flex"}}>
					<span style={{position: "absolute", left: 0}}>
						<NavBarPanelButton to="/stream" text="Stream" panel="stream" corner="top-left"/>
						<NavBarPanelButton to="/chat" text="Chat" panel="chat" corner="top-left"/>
					</span>
					<div style={{position: "absolute", zIndex: 11, left: 0, top: 45,
							boxShadow: colors.navBarBoxShadow, clipPath: "inset(0 -150px -150px 0)", display: "table"}}>
						{topLeftOpenPanel == "stream" && <StreamPanel/>}
						{topLeftOpenPanel == "chat" && <ChatPanel/>}
					</div>
					
					<span style={{margin: "0 auto", paddingLeft: 35}}>
						<NavBarButton to="/users" text="Users"/>
						<NavBarButton to="/forum" text="Forum"/>
						<NavBarButton to="/social" text="Social"/>
						<NavBarButton to="/more" text="More"/>
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
						<NavBarButton to="/global" text="Global"/>
					</span>

					<span style={{position: "absolute", right: 0, display: "flex"}}>
						<NavBarPanelButton to="/search" text="Search" panel="search" corner="top-right"/>
						<NavBarPanelButton to={auth ? "/profile" : "/sign-in"} text={auth ? auth.displayName.match(/(.+?)( |$)/)[1] : `Sign in`} panel="user" corner="top-right"/>
					</span>
					<div style={{position: "absolute", zIndex: 11, right: 0, top: 45,
							boxShadow: colors.navBarBoxShadow, clipPath: "inset(0 0 -150px -150px)", display: "table"}}>
						{topRightOpenPanel == "search" && <SearchPanel/>}
						{topRightOpenPanel == "user" && <UserPanel/>}
					</div>
				</div>
			</div>
		);
	}
}

export class NavBarButton extends BaseComponent<{to, text, onClick?}, {}> {
	render() {
		var {to, text, onClick} = this.props;
		let {page} = this.props;
		let active = to == page;

		let style = {
			display: "inline-block", cursor: "pointer", verticalAlign: "middle",
			lineHeight: "45px", color: "#FFF", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: .9
		};
		if (to)
			return <Link to={to} style={style} onClick={onClick}>{text}</Link>;
		return <div style={style} onClick={onClick}>{text}</div>
	}
}

type NavBarPanelButton_Props = {to: string, text: string, panel: string, corner: "top-left" | "top-right"} & Partial<{topLeftOpenPanel, topRightOpenPanel}>;
@Connect(state=> ({
	topLeftOpenPanel: state.main.topLeftOpenPanel,
	topRightOpenPanel: state.main.topRightOpenPanel,
}))
export class NavBarPanelButton extends BaseComponent<NavBarPanelButton_Props, {}> {
	render() {
		let {to, text, panel, corner, topLeftOpenPanel, topRightOpenPanel} = this.props;
		return (
			<NavBarButton to={to} text={text} onClick={e=> {
				e.preventDefault();
				if (corner == "top-left")
					store.dispatch(new ACTTopLeftOpenPanelSet(topLeftOpenPanel == panel ? null : panel));
				else
					store.dispatch(new ACTTopRightOpenPanelSet(topRightOpenPanel == panel ? null : panel));
			}}/>
		);
	}
}
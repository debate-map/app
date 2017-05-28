import {styles, colors} from "../../Frame/UI/GlobalStyles";
import {Dispatch} from "redux";
import {Component, PropTypes} from "react";
import GoogleButton from "react-google-button";
import {connect} from "react-redux";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {BaseComponent, BaseProps, Div} from "../../Frame/UI/ReactGlobals";
import {Debugger, E} from "../../Frame/General/Globals_Free";
import Button from "../../Frame/ReactComponents/Button";
import TextInput from "../../Frame/ReactComponents/TextInput";
import Action from "../../Frame/General/Action";
import {HandleError} from "../../Frame/General/Errors";
import UserPanel from "./NavBar/UserPanel";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {ACTTopRightOpenPanelSet, ACTTopLeftOpenPanelSet} from "../../Store/main";
import ChatPanel from "./NavBar/ChatPanel";
import StreamPanel from "./NavBar/StreamPanel";
import SearchPanel from "./NavBar/SearchPanel";
import {SubNavBarButton} from "./SubNavBar";
import Radium from "radium";
import Link from "../../Frame/ReactComponents/Link";
import NotificationsUI from "./NavBar/NotificationsUI";
import Column from "../../Frame/ReactComponents/Column";
import Row from "../../Frame/ReactComponents/Row";
import ReputationPanel from "./NavBar/ReputationPanel";
import GuidePanel from "./NavBar/GuidePanel";
import {URL} from "../../Frame/General/URLs";

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

@Connect(_=>({
	topLeftOpenPanel: State(a=>a.main.topLeftOpenPanel),
	topRightOpenPanel: State(a=>a.main.topRightOpenPanel),
	auth: State(a=>a.firebase.auth),
}))
export default class NavBar extends BaseComponent<{dispatch?, page?, topLeftOpenPanel?, topRightOpenPanel?, auth?: firebase.User}, {}> {
	static contextTypes = {store: PropTypes.object.isRequired};
	render() {
		let {topLeftOpenPanel, topRightOpenPanel, auth} = this.props;
		let {dispatch} = this.context.store;
		return (
			<nav style={{
				position: "relative", zIndex: 11, padding: "0 10px", boxShadow: colors.navBarBoxShadow,
				//background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
				background: "rgba(0,0,0,1)",
			}}>
				<div style={{display: "flex"}}>
					<span style={{position: "absolute", left: 0}}>
						<NavBarPanelButton to="/stream" text="Stream" panel="stream" corner="top-left"/>
						<NavBarPanelButton to="/chat" text="Chat" panel="chat" corner="top-left"/>
						<NavBarPanelButton to="/reputation" text={
							<Div className="cursorSet" style={{position: "relative", height: 45}}>
								<Div style={{color: "rgba(255,255,255,1)", justifyContent: "center"}}>Rep: n/a</Div>
								{/*<Div style={{color: "rgba(255,255,255,1)", justifyContent: "center"}}>Rep: 100</Div>
								<Div style={{position: "absolute", bottom: 3, width: "100%", textAlign: "center",
									fontSize: 11, lineHeight: "11px", color: "rgba(0,255,0,.7)"}}>+100</Div>*/}
							</Div> as any
						} panel="reputation" corner="top-left"/>
					</span>
					<div style={{position: "absolute", zIndex: 11, left: 0, top: 45,
							boxShadow: colors.navBarBoxShadow, clipPath: "inset(0 -150px -150px 0)", display: "table"}}>
						{topLeftOpenPanel == "stream" && <StreamPanel/>}
						{topLeftOpenPanel == "chat" && <ChatPanel/>}
						{topLeftOpenPanel == "reputation" && <ReputationPanel/>}
					</div>
					<Div ct style={{position: "fixed", left: 0, width: "30%", top: 45, bottom: 0}}>
						<NotificationsUI/>
					</Div>
					
					<span style={{margin: "0 auto", paddingLeft: 45}}>
						<NavBarButton to="/users" text="Users"/>
						<NavBarButton to="/forum" text="Forum"/>
						<NavBarButton to="/social" text="Social"/>
						<NavBarButton to="/more" text="More"/>
						<NavBarButton to="/" toImplied="/home" text="Debate Map" style={{margin: "0 auto", textAlign: "center", fontSize: 23}}/>
						<NavBarButton to="/content" text="Content"/>
						<NavBarButton to="/personal" text="Personal"/>
						<NavBarButton to="/debates" text="Debates"/>
						<NavBarButton to="/global" text="Global"/>
					</span>

					<span style={{position: "absolute", right: 0, display: "flex"}}>
						<NavBarPanelButton to="/search" text="Search" panel="search" corner="top-right"/>
						<NavBarPanelButton to="/guide" text="Guide" panel="guide" corner="top-right"/>
						<NavBarPanelButton to={auth ? "/profile" : "/sign-in"} text={auth ? auth.displayName.match(/(.+?)( |$)/)[1] : `Sign in`} panel="user" corner="top-right"/>
					</span>
					<div style={{position: "absolute", zIndex: 11, right: 0, top: 45,
							boxShadow: colors.navBarBoxShadow, clipPath: "inset(0 0 -150px -150px)", display: "table"}}>
						{topRightOpenPanel == "search" && <SearchPanel/>}
						{topRightOpenPanel == "guide" && <GuidePanel/>}
						{topRightOpenPanel == "user" && <UserPanel/>}
					</div>
				</div>
			</nav>
		);
	}
}

//@Radium
@Connect(state=> ({
	page: URL.Current().WithImpliedPathNodes().pathNodes[0],
}))
export class NavBarButton extends BaseComponent
		<{to: string, toImplied?: string, text: string, panel?: boolean, active?: boolean, style?, onClick?: (e)=>void} & Partial<{page: string}>,
		{hovered: boolean}> {
	render() {
		var {to, toImplied, text, panel, active, style, onClick, page} = this.props;
		//let {_radiumStyleState: {main: radiumState = {}} = {}} = this.state as any;
		//let {_radiumStyleState} = this.state as any;
		let {hovered} = this.state;
		active = active != null ? active : to.substr(1) == page || (toImplied && toImplied.substr(1) == page);

		let finalStyle = E(
			{
				position: "relative", display: "inline-block", cursor: "pointer", verticalAlign: "middle",
				lineHeight: "45px", color: "#FFF", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: .9,
				//":hover": {color: "rgba(100,255,100,1)"}
				//":hover": {color: "rgba(100,150,255,1)"}
				//":hover": {}
			},
			/*panel && {":hover": {color: "rgba(100,255,100,1)"}},
			panel && active && {color: "rgba(100,255,100,1)"},*/
			style,
		);

		//let hoverOrActive = radiumState[":hover"] || active;
		//let hoverOrActive = _radiumStyleState && _radiumStyleState.main && _radiumStyleState.main[":hover"] || active;
		let hoverOrActive = hovered || active;
		if (to) {
			return (
				<Link to={to} style={finalStyle} onClick={onClick} onMouseEnter={()=>this.SetState({hovered: true})} onMouseLeave={()=>this.SetState({hovered: false})}>
					{text}
					{/*!panel &&*/ hoverOrActive &&
						<div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: `rgba(100,255,100,1)`}}/>}
				</Link>
			);
		}
		return (
			<div style={finalStyle} onClick={onClick} onMouseEnter={()=>this.SetState({hovered: true})} onMouseLeave={()=>this.SetState({hovered: false})}>
				{text}
				{/*!panel &&*/ hoverOrActive &&
					<div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: `rgba(100,255,100,1)`}}/>}
			</div>
		);
	}
}

type NavBarPanelButton_Props = {to: string, text: string, panel: string, corner: "top-left" | "top-right"} & Partial<{topLeftOpenPanel, topRightOpenPanel}>;
@Connect(_=> ({
	topLeftOpenPanel: State(a=>a.main.topLeftOpenPanel),
	topRightOpenPanel: State(a=>a.main.topRightOpenPanel),
}))
export class NavBarPanelButton extends BaseComponent<NavBarPanelButton_Props, {}> {
	render() {
		let {to, text, panel, corner, topLeftOpenPanel, topRightOpenPanel} = this.props;
		let active = (corner == "top-left" ? topLeftOpenPanel : topRightOpenPanel) == panel;
		return (
			<NavBarButton to={to} text={text} panel={true} active={active} onClick={e=> {
				e.preventDefault();
				if (corner == "top-left")
					store.dispatch(new ACTTopLeftOpenPanelSet(active ? null : panel));
				else
					store.dispatch(new ACTTopRightOpenPanelSet(active ? null : panel));
			}}/>
		);
	}
}
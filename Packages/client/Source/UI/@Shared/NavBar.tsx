import {RootState, store} from "Store";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {HasAdminPermissions, Me, MeID} from "dm_common";
import React, {useCallback} from "react";
import {Link, NavBarPanelButton, NotificationsUI, Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {DebugPanel} from "./NavBar/DebugPanel.js";
import {GuidePanel} from "./NavBar/GuidePanel.js";
import {ReputationPanel} from "./NavBar/ReputationPanel.js";
import {SearchPanel} from "./NavBar/SearchPanel.js";
import {StreamPanel} from "./NavBar/StreamPanel.js";
import {UserPanel} from "./NavBar/UserPanel.js";

export const navBarHeight = 45;

@Observer
export class NavBar extends BaseComponent<{}, {}> {
	render() {
		const uiState = store.main;
		//const dbNeedsInit = GetDocs({}, a=>a.maps) === null; // use maps because it won't cause too much data to be downloaded-and-watched; improve this later
		return (
			<nav style={{
				position: "relative", zIndex: zIndexes.navBar,
				padding: "0 10px", boxShadow: liveSkin.NavBarBoxShadow(),
				// background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
				background: "rgba(0,0,0,1)",
			}}>
				<div style={{display: "flex"}}>
					<span style={{position: "absolute", left: 0}}>
						<NavBarPanelButton text="Stream" panel="stream" corner="top-left"/>
						{HasAdminPermissions(MeID()) && <NavBarPanelButton text="Debug" panel="debug" corner="top-left"/>}
						{/* <NavBarPanelButton text="Chat" panel="chat" corner="top-left"/>
						<NavBarPanelButton text={
							<Div className="cursorSet" style={{position: "relative", height: navBarHeight}}>
								<Div style={{color: "rgba(255,255,255,1)", justifyContent: "center"}}>Rep: n/a</Div>
								{/*<Div style={{color: "rgba(255,255,255,1)", justifyContent: "center"}}>Rep: 100</Div>
								<Div style={{position: "absolute", bottom: 3, width: "100%", textAlign: "center",
									fontSize: 11, lineHeight: "11px", color: "rgba(0,255,0,.7)"}}>+100</Div>*#/}
							</Div> as any
						} panel="reputation" corner="top-left"/> */}
					</span>
					<div style={{
						position: "fixed", display: "flex", zIndex: zIndexes.navBar, left: 0, top: navBarHeight, maxHeight: `calc(100% - ${navBarHeight}px - 30px)`,
						boxShadow: liveSkin.NavBarBoxShadow(), clipPath: "inset(0 -150px -150px 0)", // display: 'table'
					}}>
						{uiState.topLeftOpenPanel == "stream" && <StreamPanel/>}
						{uiState.topLeftOpenPanel == "debug" && <DebugPanel/>}
						{uiState.topLeftOpenPanel == "reputation" && <ReputationPanel/>}
					</div>
					<NotificationsUI placement="topLeft" navBarHeight={navBarHeight}/>

					<span style={{margin: "0 auto", paddingRight: 20}}>
						<NavBarPageButton page="database" text="Database"/>
						<NavBarPageButton page="feedback" text="Feedback"/>
						{/* <NavBarButton page="forum" text="Forum"/> */}
						<NavBarPageButton page="more" text="More"/>
						<NavBarPageButton page="home" text="Debate Map" style={{margin: "0 auto", textAlign: "center", fontSize: 23}}/>
						<NavBarPageButton page="social" text="Social"/>
						<NavBarPageButton page="debates" text="Debates"/>
						<NavBarPageButton page="global" text="Global"/>
					</span>

					<span style={{position: "absolute", right: 0, display: "flex"}}>
						<NavBarPanelButton text="Search" panel="search" corner="top-right"/>
						{/* <NavBarPanelButton text="Guide" panel="guide" corner="top-right"/> */}
						<NavBarPanelButton text={Me() ? Me()!.displayName.match(/(.+?)( |$)/)![1] : "Sign in"} panel="profile" corner="top-right"/>
					</span>
					<div style={{
						position: "fixed", display: "flex", zIndex: zIndexes.navBar, right: 0, top: navBarHeight, maxHeight: `calc(100% - ${navBarHeight}px - 30px)`,
						boxShadow: liveSkin.NavBarBoxShadow(), clipPath: "inset(0 0 -150px -150px)", // display: 'table',
					}}>
						{uiState.topRightOpenPanel == "search" && <SearchPanel/>}
						{uiState.topRightOpenPanel == "guide" && <GuidePanel/>}
						{uiState.topRightOpenPanel == "profile" && <UserPanel/>}
					</div>
				</div>
			</nav>
		);
	}
}

@Observer
export class NavBarPageButton extends BaseComponentPlus(
	{} as {page?: string, text: string, panel?: boolean, active?: boolean, style?, onClick?: (e)=>void},
	{hovered: false},
) {
	render() {
		let {page, text, panel, active, style, onClick} = this.props;
		// let {_radiumStyleState: {main: radiumState = {}} = {}} = this.state as any;
		// let {_radiumStyleState} = this.state as any;
		const {hovered} = this.state;

		const currentPage = store.main.page;
		active = active != null ? active : page == currentPage;

		const finalStyle = E(
			{
				position: "relative", display: "inline-block", cursor: "pointer", verticalAlign: "middle",
				lineHeight: `${navBarHeight}px`, color: "#FFF", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: 0.9,
			},
			style,
		);

		const actionFunc = (s: RootState)=>{
			if (page && !panel) {
				if (page != currentPage) {
					s.main.page = page;
				} else {
					// go to the page root-contents, if clicking on page in nav-bar we're already on
					//s.main[currentPage].subpage = null;
					s.main[currentPage].subpage = rootPageDefaultChilds[currentPage];

					if (page == "database") {
						// if our default subpage is already active, then perform that subpage's action-if-already-active
						if ([null, "users"].Contains(store.main.database.subpage)) {
							s.main.database.selectedUserID = null;
						}
					} /*else if (page == "feedback") {
						s.feedback.main.proposals.selectedProposalID = null;
					}*/ else if (page == "debates") {
						s.main.debates.selectedMapID = null;
					}
				}
			}
		};

		const hoverOrActive = hovered || active;
		return (
			<Link actionFunc={actionFunc} style={finalStyle} onMouseEnter={useCallback(()=>this.SetState({hovered: true}), [])} onMouseLeave={useCallback(()=>this.SetState({hovered: false}), [])} onClick={onClick}>
				{text}
				{hoverOrActive &&
					<div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(100,255,100,1)"}}/>}
			</Link>
		);
	}
}
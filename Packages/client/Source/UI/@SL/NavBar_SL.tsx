import {DeepGet, E, emptyArray} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Button, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {RootState, store} from "Store";
import {SearchPanel} from "UI/@Shared/NavBar/SearchPanel.js";
import {UserPanel} from "UI/@Shared/NavBar/UserPanel.js";
import {Observer, Link, HSL, NavBarPanelButton, NotificationsUI} from "web-vcore";
import {GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import React from "react";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {HasAdminPermissions, Me, MeID} from "dm_common";
import {DebugPanel} from "UI/@Shared/NavBar/DebugPanel.js";
import {SLMode_2020, SLMode_AI, SLMode_COVID, GetGADExternalSiteURL, SLMode_GAD, SLMode_Main, SLMode_IA, SLMode_Climate} from "./SL.js";

// main
// ==========

@Observer
export class NavBar_SL extends BaseComponent<{}, {}> {
	//loadingUI = ()=>null; // UI looks bad when nav-bar shows loading text (size changes)
	render() {
		const uiState = store.main;
		//const dbNeedsInit = GetDocs({}, a=>a.maps) === emptyArray; // use maps because it won't cause too much data to be downloaded-and-watched; improve this later
		return (
			<nav style={{
				position: "relative", zIndex: zIndexes.navBar, height: 150, boxShadow: liveSkin.NavBarBoxShadow(),
				//background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
				//background: 'rgba(0,0,0,1)',
			}}>
				<Row center style={{height: "100%"}}>
					<span style={{position: "absolute", left: 0}}>
						{HasAdminPermissions(MeID()) && (DEV_DYN || store.main.maps.forcedExpand) && <NavBarPanelButton text="Debug" panel="debug" corner="top-left"/>}
					</span>
					<div style={{
						position: "fixed", display: "flex", zIndex: zIndexes.navBar, left: 0, top: 150, maxHeight: "calc(100% - 150px - 30px)",
						boxShadow: liveSkin.NavBarBoxShadow(), clipPath: "inset(0 -150px -150px 0)", // display: 'table'
					}}>
						{uiState.topLeftOpenPanel == "debug" && <DebugPanel/>}
					</div>
					<NotificationsUI placement="topLeft" navBarHeight={150}/>

					{!SLMode_2020 &&
					<span style={{margin: "0 auto", paddingRight: 13}}>
						<NavBarPageButton page="database" text="Database"/>
						<NavBarPageButton page="home" text="Home"/>
						<NavBarPageButton page="debates" text="Debates"/>
					</span>}
					{SLMode_2020 &&
					<span style={{margin: "0 auto", paddingLeft: 100}}>
						<NavBarPageButton page="home" text="Home"/>
						<NavBarPageButton page="debates" text="Debate" actionFunc={s=>{
							s.main.page = "debates";
							s.main.debates.selectedMapID = "a4znL3UZTki9C66mnvsFow";
						}}/>
					</span>}

					<span style={{position: "absolute", right: 30, display: "flex"}}>
						<NavBarPanelButton text="Search" panel="search" corner="top-right"/>
						<NavBarPanelButton text={Me() ? Me()!.displayName.match(/(.+?)( |$)/)![1] : "Sign in"} panel="profile" corner="top-right"/>
					</span>
					<div style={{
						position: "fixed", display: "flex", zIndex: zIndexes.navBar, right: 0, top: 150, maxHeight: "calc(100% - 150px - 30px)",
						boxShadow: liveSkin.NavBarBoxShadow(), clipPath: "inset(0 0 -150px -150px)", // display: 'table',
					}}>
						{uiState.topRightOpenPanel == "search" && <SearchPanel/>}
						{uiState.topRightOpenPanel == "profile" && <UserPanel/>}
					</div>
				</Row>
			</nav>
		);
	}
}

@Observer
class NavBarPageButton extends BaseComponent<{page?: string, text: string, panel?: boolean, active?: boolean, style?, onClick?: (e)=>void, actionFunc?: (s: RootState)=>any}, {hovered: boolean}> {
	render() {
		let {page, text, panel, active, style, onClick} = this.props;
		const currentPage = store.main.page;
		// let {_radiumStyleState: {main: radiumState = {}} = {}} = this.state as any;
		// let {_radiumStyleState} = this.state as any;
		const {hovered} = this.state;
		active = active != null ? active : page == currentPage;

		const sideButton = ["search", "profile"].Contains(page);
		let finalStyle = E(
			{
				position: "relative", display: "inline-block", cursor: "pointer", verticalAlign: "middle",
				fontFamily: SLSkin.main.HeaderFont(),
				fontSize: sideButton ? 16 : 18, textTransform: sideButton ? "uppercase" : null, fontWeight: "normal",
				lineHeight: "150px", color: "#000", padding: "0 15px", textDecoration: "none", opacity: 0.9,
			},
			style,
		);
		const bottomBar = <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: HSL(220, 0.2, 0.2)}}/>;

		if (page == "website") {
			//return <Link to="https://greatamericandebate.org" style={finalStyle} onMouseEnter={()=>this.SetState({hovered: true})} onMouseLeave={()=>this.SetState({hovered: false})}>
			return <Link to={GetGADExternalSiteURL()} style={finalStyle} onMouseEnter={()=>this.SetState({hovered: true})} onMouseLeave={()=>this.SetState({hovered: false})}>
				Website
				{hovered && bottomBar}
			</Link>;
		}
		if (page == "home") {
			finalStyle = E(
				finalStyle,
				{margin: "0 30px", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundOrigin: "content-box", backgroundSize: "contain", padding: "20px 0"}, // alt to padding: {backgroundSize: "auto calc(100% - 25px)"}
				SLMode_Main && {width: 300, height: 150, backgroundImage: "url(/Images/@SL/Main/Title.png)"},
				SLMode_GAD && {width: 400, height: 150, backgroundImage: "url(/Images/@SL/GAD/Title_Cropped.png)", padding: "5px 0"},
				SLMode_COVID && {width: 500, height: 150, backgroundImage: "url(/Images/@SL/COVID/Title.png)", padding: "15px 0"},
				SLMode_2020 && {width: 500, height: 150, backgroundImage: "url(/Images/@SL/2020/2020ElectionDemo.png)"},
				SLMode_AI && {width: 300, height: 150, backgroundImage: "url(/Images/@SL/AI/Title_Cropped.png)", padding: "15px 0"},
				SLMode_IA && {width: 300, height: 150, backgroundImage: "url(/Images/@SL/IA/Title.png)", padding: "15px 0"},
				SLMode_Climate && {width: 300, height: 150, backgroundImage: "url(/Images/@SL/Climate/Title.png)", padding: "5px 0 10px 0px"},
			);
			text = null as any;
		}
		// in these sl-modes, disable navigating to other pages
		if (SLMode_Climate) {
			if (page == "home") finalStyle = E(finalStyle, {pointerEvents: "none"});
			if (page == "database" || page == "debates") finalStyle = E(finalStyle, {display: "none"});
		}

		const actionFunc = this.props.actionFunc ?? ((s: RootState)=>{
			if (page) {
				if (page != currentPage) {
					s.main.page = page;
				} else {
					// go to the page root-contents, if clicking on page in nav-bar we're already on
					//root.main[currentPage].subpage = null;
					s.main[currentPage].subpage = rootPageDefaultChilds[currentPage];

					if (page == "debates") {
						s.main.debates.selectedMapID = null;
					}
				}
			}
		});

		const hoverOrActive = hovered || active;
		return (
			<Link actionFunc={actionFunc} style={finalStyle} onMouseEnter={()=>this.SetState({hovered: true})} onMouseLeave={()=>this.SetState({hovered: false})} onClick={onClick}>
				{text}
				{hoverOrActive && bottomBar}
			</Link>
		);
	}
}
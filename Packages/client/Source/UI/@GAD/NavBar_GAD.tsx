import {DeepGet, E, emptyArray} from "web-vcore/nm/js-vextensions.js";
import {dbVersion} from "Main";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Button, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {RootState, store} from "Store";
import {NotificationsUI} from "UI/@Shared/NavBar/NotificationsUI.js";
import {SearchPanel} from "UI/@Shared/NavBar/SearchPanel.js";
import {UserPanel} from "UI/@Shared/NavBar/UserPanel.js";
import {Observer, Link, HSL, NavBarPanelButton} from "web-vcore";
import {GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import React from "react";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {Me} from "dm_common";
import {GADDemo_2020, GADDemo_COVID, GADDemo_Main as GADDemo_Nuclear, GetGADExternalSiteURL} from "./GAD.js";

// main
// ==========

@Observer
export class NavBar_GAD extends BaseComponentPlus({}, {}) {
	//loadingUI = ()=>null; // UI looks bad when nav-bar shows loading text (size changes)
	render() {
		const {topRightOpenPanel} = store.main;
		//const dbNeedsInit = GetDocs({}, a=>a.maps) === emptyArray; // use maps because it won't cause too much data to be downloaded-and-watched; improve this later
		return (
			<nav style={{
				position: "relative", zIndex: zIndexes.navBar, height: 150, boxShadow: liveSkin.NavBarBoxShadow(),
				// background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
				// background: 'rgba(0,0,0,1)',
			}}>
				<Row center style={{height: "100%"}}>
					<span style={{position: "absolute", left: 0}}>
						{/* <NavBarPanelButton text="Stream" panel="stream" corner="top-left"/>
						<NavBarPanelButton text="Chat" panel="chat" corner="top-left"/>
						<NavBarPanelButton text={
							<Div className="cursorSet" style={{position: "relative", height: 45}}>
								<Div style={{color: "rgba(255,255,255,1)", justifyContent: "center"}}>Rep: n/a</Div>
								{/*<Div style={{color: "rgba(255,255,255,1)", justifyContent: "center"}}>Rep: 100</Div>
								<Div style={{position: "absolute", bottom: 3, width: "100%", textAlign: "center",
									fontSize: 11, lineHeight: "11px", color: "rgba(0,255,0,.7)"}}>+100</Div>*#/}
							</Div> as any
						} panel="reputation" corner="top-left"/> */}
					</span>
					<Div ct style={{position: "fixed", left: 0, width: "30%", top: 150, bottom: 0}}>
						<NotificationsUI/>
					</Div>

					{!GADDemo_2020 &&
					<span style={{margin: "0 auto", paddingRight: 13}}>
						<NavBarPageButton page="database" text="Database"/>
						<NavBarPageButton page="home" text="Home"/>
						<NavBarPageButton page="debates" text="Debates"/>
					</span>}
					{GADDemo_2020 &&
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
						{topRightOpenPanel == "search" && <SearchPanel/>}
						{topRightOpenPanel == "profile" && <UserPanel/>}
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
			/*const onHomePage = currentPage == "home";
			finalStyle = E(finalStyle, {
				margin: "0 50px", width: 150, height: 150,
				backgroundImage: "url(/Images/@GAD/Logo.png)", backgroundPosition: "center top", backgroundSize: onHomePage ? "100%" : "75%", backgroundRepeat: "no-repeat",
			});
			if (onHomePage) {
				text = null;
			} else {
				text = <div style={{
					position: "absolute", bottom: 10, pointerEvents: "none", left: "-50%", right: "-50%", width: "200%", height: 30,
					backgroundImage: "url(/Images/@GAD/GADTitle.png)", backgroundSize: "100%", backgroundRepeat: "no-repeat",
				}}/> as any;
			}*/

			/*finalStyle = E(finalStyle, {
				margin: "0 50px", width: 150, height: 150,
				backgroundImage: "url(/Images/@GAD/Logo.png)", backgroundPosition: "center top", backgroundSize: onHomePage ? "100%" : "75%", backgroundRepeat: "no-repeat",
			});
			text = <div style={{
				position: "absolute", bottom: 10, pointerEvents: "none", left: "-50%", right: "-50%", width: "200%", height: 30,
				backgroundImage: "url(/Images/@GAD/COVID/Title.png)", backgroundSize: "100%", backgroundRepeat: "no-repeat",
			}}/> as any;*/

			finalStyle = E(
				finalStyle,
				{margin: "0 30px", backgroundPosition: "center", backgroundSize: "100%", backgroundRepeat: "no-repeat"},
				GADDemo_Nuclear && {width: 400, height: 150, backgroundImage: "url(/Images/@GAD/Nuclear/Title_Cropped.png)"},
				GADDemo_COVID && {width: 500, height: 150, backgroundImage: "url(/Images/@GAD/COVID/Title.png)"},
				GADDemo_2020 && {width: 500, height: 150, backgroundImage: "url(/Images/@GAD/2020ElectionDemo.png)"},
			);
			text = null as any;
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
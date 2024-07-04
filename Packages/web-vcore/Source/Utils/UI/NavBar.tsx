import {E} from "js-vextensions";
import {runInAction} from "mobx";
import React, {Children, useCallback} from "react";
import {BaseComponentPlus, cssHelper} from "react-vextensions";
import {manager} from "../../Manager.js";
import {Link} from "../ReactComponents/Link.js";
import {Observer, RunInAction} from "../Store/MobX.js";

// todo: someday move the NavBar comp itself here (probably)

@Observer
export class NavBarButton extends BaseComponentPlus(
	{} as {page?: string|n, subpage?: string, text?: string, panel?: boolean, active?: boolean, style?, onClick?: (e)=>void},
	{hovered: false},
) {
	render() {
		let {page, subpage, text, active, style, onClick, children} = this.props;
		// let {_radiumStyleState: {main: radiumState = {}} = {}} = this.state as any;
		// let {_radiumStyleState} = this.state as any;
		const {hovered} = this.state;
		const largeVersion = manager.useExpandedNavBar();

		const currentPage = manager.store.main.page;
		active = active != null ? active : page == currentPage;
		const pageEntry = page != null ? manager.pageTree.children[page] : null;

		//const actionFunc = page ? (s: RootStore)=>{
		const actionFunc = page && pageEntry ? (s: any)=>{
			if (page != currentPage) {
				s.main.page = page;
			} else {
				const pageStore = s.main[currentPage];
				const newSubpage = manager.pageTree.children[currentPage].DefaultChild;
				// go to the page root-contents, if clicking on page in nav-bar we're already on
				if (pageStore.subpage != newSubpage) {
					//s.main[currentPage].subpage = null;
					pageStore.subpage = newSubpage;
				} else {
					if (newSubpage) {
						const subpageEntry = pageEntry.children[newSubpage];
						if (subpageEntry.actionIfActive) {
							//runInAction("NavBarPageButton.subpage.actionIfActive", ()=>subpageEntry.actionIfActive(s));
							subpageEntry.actionIfActive(s);
						}
					}
					if (pageEntry.actionIfActive) {
						pageEntry.actionIfActive(s);
						//runInAction("NavBarPageButton.actionIfActive", ()=>pageEntry.actionIfActive(s));
					}
				}
			}

			const pageStore = s.main[currentPage];
			if (subpage != null && subpage != pageStore.subpage) {
				pageStore.subpage = subpage;
			}
		} : null;

		const hoverOrActive = hovered || active;
		const {css} = cssHelper(this);
		return (
			<Link actionFunc={actionFunc} onClick={onClick}
				onMouseEnter={useCallback(()=>this.SetState({hovered: true}), [])}
				onMouseLeave={useCallback(()=>this.SetState({hovered: false}), [])}
				style={css(
					{
						height: "100%",
						display: "flex", alignItems: "center", justifyContent: "center",
						position: "relative", cursor: "pointer",
						lineHeight: largeVersion ? "45px" : "25px", color: "rgba(255,255,255,1)", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: 0.9,
					},
					style,
				)}
			>
				{text}
				{children}
				{hoverOrActive &&
					<div style={css({position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(100,255,100,1)"})}/>}
			</Link>
		);
	}
}

@Observer
export class NavBarPageButton extends BaseComponentPlus({} as {page?: string, subpage?: string, text: string, style?}, {}) {
	render() {
		const {...rest} = this.props;
		return (
			<NavBarButton {...rest}/>
		);
	}
}

@Observer
export class NavBarPanelButton extends BaseComponentPlus({} as {text?: string, panel: string, onClick?: (e: any) => void, hasPage?: boolean, corner: "top-left" | "top-right", style?}, {}, {active: false}) {
	render() {
		const {text, onClick, panel, hasPage, corner, style, children} = this.props;
		const {topLeftOpenPanel, topRightOpenPanel} = manager.store.main;
		const active = (corner == "top-left" ? topLeftOpenPanel : topRightOpenPanel) == panel;

		this.Stash({active});
		const {css} = cssHelper(this);
		return (
			<NavBarButton page={hasPage ? panel : null} text={text} panel={true} active={active} onClick={e=>{
				if (onClick) {
					onClick(e);
				}
				this.OnClick(e);
			}} style={css(style)}>
				{children}
			</NavBarButton>
		);
	}

	OnClick = (e: MouseEvent)=>{
		e.preventDefault();
		const {corner, panel, active} = this.PropsStateStash;
		RunInAction("NavBarPanelButton_OnClick", ()=>{

			if (corner == "top-left") {
				manager.store.main.topLeftOpenPanel = active ? null : panel;
			} else {
				manager.store.main.topRightOpenPanel = active ? null : panel;
			}
		});
	};
}
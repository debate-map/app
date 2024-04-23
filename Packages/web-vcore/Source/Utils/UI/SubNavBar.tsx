import {E} from "js-vextensions";
import {BaseComponent, BaseComponentPlus, cssHelper} from "react-vextensions";
import React, {ClassAttributes, ComponentProps, ComponentPropsWithoutRef} from "react";
import {RootStore} from "web-vcore_UserTypes";
import {Page} from "../../Utils/URL/URLs.js";
import {manager} from "../../Manager.js";
import {ActionFunc, Observer} from "../Store/MobX.js";
import {Link} from "../ReactComponents/Link.js";

export const subNavBarHeight = 30;

export class SubNavBar_Auto extends BaseComponent<{page: string, fullWidth?: boolean, filter?: (subpage: Page)=>boolean}, {}> {
	render() {
		const {page, filter, ...rest} = this.props;
		const subpages = manager.pageTree.children[page]?.children.VValues() ?? [];
		return (
			<SubNavBar>
				{subpages.filter(filter ?? (page=>true)).map(subpage=>{
					return <SubNavBarButton key={subpage.key} {...{page}} subpage={subpage.key} text={subpage.title}/>;
				})}
			</SubNavBar>
		);
	}
}

@Observer // in case manager.useExpandedNavBar() uses mobx-getters
export class SubNavBar extends BaseComponent<{fullWidth?: boolean}, {}> {
	render() {
		const {fullWidth, children} = this.props;
		if (!manager.useExpandedNavBar()) return null; // if sub-nav-bar hidden, subpage selection is handled in project's NavBar.tsx

		const {key, css, dyn} = cssHelper(this);
		return (
			<nav className={key("root", "clickThrough")} style={css({
				position: "absolute", zIndex: dyn(manager.zIndexes.subNavBar), top: 0, width: "100%", textAlign: "center",
				// background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			})}>
				<div className={key("sub1")} style={css(
					{
						display: "inline-block",
						background: manager.GetSkin().OverlayPanelBackgroundColor().css(),
						boxShadow: manager.GetSkin().NavBarBoxShadow(),
						color: "rgb(255,255,255)",
					},
					dyn(fullWidth ? {width: "100%"} : {borderRadius: "0 0 10px 10px"}),
				)}>
					{children}
				</div>
			</nav>
		);
	}
}

@Observer
export class SubNavBarButton extends BaseComponentPlus({} as {
	page: string, subpage: string, text: string,
	actionFuncIfAlreadyActive?: ActionFunc<RootStore>,
} & ComponentPropsWithoutRef<typeof Link>, {}) {
	render() {
		const {page, subpage, text, actionFuncIfAlreadyActive, to, style, ...rest} = this.props;
		const currentSubpage = manager.store.main[page].subpage ?? manager.pageTree.children[page]?.DefaultChild;
		const active = subpage == currentSubpage;

		let actionFunc: ActionFunc<RootStore>|undefined;
		if (to == null) {
			if (!active) {
				actionFunc = s=>s["main"][page].subpage = subpage;
			} else if (actionFuncIfAlreadyActive) {
				actionFunc = actionFuncIfAlreadyActive;
			}
		}

		const {css} = cssHelper(this);
		return (
			<Link {...rest} actionFunc={actionFunc} to={to} text={text} style={css(
				{
					display: "inline-block", cursor: "pointer", verticalAlign: "middle",
					lineHeight: `${subNavBarHeight}px`, color: "rgba(255,255,255,1)", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: 0.9,
					":hover": {color: "rgba(100,255,100,1)"},
				},
				active && {color: "rgba(100,255,100,1)"},
				style,
			)}/>
		);
	}
}
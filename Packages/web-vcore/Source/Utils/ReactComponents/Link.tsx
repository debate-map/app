import {VURL, Assert, E} from "js-vextensions";
import React, {useCallback} from "react";
import {BaseComponent, FilterOutUnrecognizedProps, BaseComponentPlus, BaseProps, BasicStyles} from "react-vextensions";
import {runInAction} from "mobx";
import {RootStore} from "web-vcore_UserTypes";
import {BailError, observer_mgl} from "mobx-graphlink";
import {GetCurrentURL} from "../URL/URLs.js";
import {manager} from "../../Manager.js";
import {ActionFunc, ActionFuncWithExtras, Observer, RunInAction} from "../Store/MobX.js";
import {NotifyCalledHistoryReplaceOrPushState} from "./AddressBarWrapper.js";
import {ES} from "../UI/Styles.js";

function isModifiedEvent(event) {
	return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

// maybe todo: extract this comp into its own library (or react-vcomponents)

export type Link_Props = {
	text?: string|n, to?: string|n, target?: string|n, replace?: boolean|n, // url-based
	//actions?: (dispatch: Function)=>void,
	actionFunc?: ActionFuncWithExtras<RootStore, {callType: "click" | "getUrl"}>|n, // new approach, for mobx/mst store
	//updateURLOnActions?: boolean, // action-based
} & BaseProps & Omit<React.HTMLProps<HTMLAnchorElement>, "href">;

export const Link = observer_mgl((props: Link_Props)=>{
	Assert("actionFunc" in props || "to" in props, `Must supply the Link component with either an "actionFunc" or "to" property.`);
	const {onClick, style, target, replace: replaceURL, actionFunc, children, ...rest} = props;
	let {text, to} = props;

	if (actionFunc) {
		/*const newState = produce(manager.store, draft=>{
			actionFunc(draft);
		});
		//let newURL = UsingRootState(newState, ()=>manager.GetNewURL());
		const newURL = WithStore({}, newState, ()=>manager.GetNewURL());
		//const newURL = manager.GetNewURL.WS(newState)();
		to = newURL.toString();*/
		try {
			to = manager.GetNewURLForStoreChanges(store=>actionFunc(store, {callType: "getUrl"}));
		} catch (ex) {
			if (ex instanceof BailError) {
				// if "error" was just a bail, do nothing (data for the "to" prop is just still loading)
				// (we still catch the bail-error though, because we don't want the "default loading ui" for bails to be shown)
			} else {
				console.error(`Error while calculating Link's "to" prop:`, ex);
			}
		}
	}

	//if (manager.prodEnv && to == null) return; // defensive
	//const href = this.context.router.history.createHref(typeof to === 'string' ? {pathname: to} : to)

	// if external link (and target not specified), set target to "_blank", causing it to open in new tab
	const isExternal = to && VURL.Parse(to, true).domain != GetCurrentURL().domain;
	const target_final = isExternal && target === undefined ? "_blank" : target;

	if (text == null && children == null) {
		text = to;
	}

	const handleClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>)=>{
		if (onClick) onClick(event);

		if (event.defaultPrevented) return; // onClick prevented default
		if (event.button !== 0) return; // ignore right clicks
		if (isModifiedEvent(event)) return; // ignore clicks with modifier keys

		if (actionFunc != null) {
			event.preventDefault();
			RunInAction("Link.handleClick", ()=>actionFunc(manager.store, {callType: "click"}));
		} else if (to != null) {
			const isExternalOrNewTab = VURL.Parse(to, true).domain != GetCurrentURL().domain;
			if (isExternalOrNewTab || target) return; // let browser handle external or new-tab links

			event.preventDefault();
			//manager.store.dispatch(replaceURL ? replace(to) : push(to));
			if (replaceURL) {
				history.replaceState(null, null as any, to);
				NotifyCalledHistoryReplaceOrPushState();
			} else {
				history.pushState(null, null as any, to);
				NotifyCalledHistoryReplaceOrPushState();
			}
		}
	}, [onClick, to, target, replaceURL, actionFunc]);

	return (
		<a {...FilterOutUnrecognizedProps(rest, "a")} onClick={handleClick} href={to ?? undefined} target={target_final} rel={isExternal ? "noopener noreferrer nofollow" : undefined} style={ES(
			BasicStyles(props),
			style,
		)}>
			{text}
			{children}
		</a>
	);
});
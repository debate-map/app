import React from 'react';
import {BaseComponent, ApplyBasicStyles, BaseComponentWithConnector} from "react-vextensions";
import Radium from "radium";
import {replace, push} from "redux-little-router";
import {Connect} from "../Database/FirebaseConnect";
import {MakeRootReducer} from "../../Store/index";
import { GetNewURL } from "../URL/URLManager";
import {GetCurrentURL} from "../General/URLs";
import {VURL} from "js-vextensions";
import { StandardCompProps } from "Frame/UI/General";
import {State_overrideCountAsAccess_value, StopStateCountAsAccessOverride, StartStateCountAsAccessOverride} from 'UI/@Shared/StateOverrides';
import {StartStateDataOverride, StopStateDataOverride} from "../../UI/@Shared/StateOverrides";
import Action from "Frame/General/Action";

/*@Radium
export default class Link extends BaseComponent<{to, target?: string, replace?: boolean, style?, onClick?}, {}> {
	render() {
		let {to, style, onClick, children} = this.props;
		return <LinkInner to={to} style={style} onClick={onClick}>{children}</LinkInner>;
	}
}*/

function isModifiedEvent(event) {
	return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

type Props = {
	onClick?, style?,
	text?: string, to?: string, target?: string, replace?: boolean, // url-based
	actions?: (dispatch: (...actions: Action<any>[])=>void)=>void, //updateURLOnActions?: boolean, // action-based
} & React.HTMLProps<HTMLAnchorElement>;
//@Connect((state, {to, actions, updateURLOnActions}: Props)=> {
let connector = (state, {to, actions}: Props)=> {
	if (actions) {
		let actionsToDispatch = [];
		function dispatch(...actions: Action<any>[]) {
			actionsToDispatch.push(...actions);
		}
		actions(dispatch);

		let newState = State();
		//let rootReducer = MakeRootReducer();
		let rootReducer = store.reducer;
		for (let action of actionsToDispatch) {
			newState = rootReducer(newState, action);
		}
		StartStateDataOverride("", newState);
		StartStateCountAsAccessOverride(false);
		let newURL = GetNewURL();
		StopStateCountAsAccessOverride();
		StopStateDataOverride();

		to = newURL.toString();
	}
	return {
		//oldLocation: updateURLOnActions ? State(a=>a.router.location) : null,
		to,
	};
};
@Connect(connector)
@ApplyBasicStyles
export class Link extends BaseComponentWithConnector(connector, {}) {
	handleClick(event) {
		let {onClick, to, target, replace: replaceURL, actions} = this.props;
		if (onClick) onClick(event);

		if (event.defaultPrevented) return; // onClick prevented default
		if (event.button !== 0) return; // ignore right clicks
		if (isModifiedEvent(event)) return; // ignore clicks with modifier keys

		if (actions) {
			event.preventDefault();
			function dispatch(...actions: Action<any>[]) {
				for (let action of actions) {
					store.dispatch(action);
				}
			}
			actions(dispatch); // apply actions
		} else {
			let isExternal = to && VURL.Parse(to, true).domain != GetCurrentURL().domain;
			if (isExternal || target) return; // let browser handle external links, and "target=_blank"

			event.preventDefault();
			store.dispatch(replaceURL ? replace(to) : push(to));
		}
	}

	render() {
		let {text, to, target, actions, children, ...rest} = this.props // eslint-disable-line no-unused-vars
		if (!to) return <a/>;
		
		//const href = this.context.router.history.createHref(typeof to === 'string' ? {pathname: to} : to)
		let isExternal = to && VURL.Parse(to, true).domain != GetCurrentURL().domain;
		if (isExternal && target === undefined) {
			target = "_blank";
		}

		return (
			<a {...rest.Excluding(...StandardCompProps())} onClick={this.handleClick} href={to} target={target}>
				{text}
				{children}
			</a>
		);
	}

	// add proxy, since using Radium
	/*setState(newState, callback?) {
		return this.SetState(newState, callback);
	}*/
}
//Link.prototype.setState = function(newState, callback?) { return this.SetState(newState, callback); }; // add proxy, since using Radium
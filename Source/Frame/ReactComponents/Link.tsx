import React from 'react';
import { PropTypes } from "react";
import {BaseComponent, ApplyBasicStyles} from "react-vextensions";
import Radium from "radium";
import {replace, push} from "redux-little-router";
import {Connect} from "../Database/FirebaseConnect";
import {MakeRootReducer} from "../../Store/index";
import { GetNewURL } from "../URL/URLManager";
import {State_overrides} from "../../UI/@Shared/StateOverrides";
import {GetCurrentURL} from "../General/URLs";
import {VURL} from "js-vextensions";

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
	actions?: (dispatch: Function)=>void, //updateURLOnActions?: boolean, // action-based
} & React.HTMLProps<HTMLAnchorElement>;
//@Connect((state, {to, actions, updateURLOnActions}: Props)=> {
@Connect((state, {to, actions}: Props)=> {
	if (actions) {
		let actionsToDispatch = [];
		function dispatch(action) {
			actionsToDispatch.push(action);
		}
		actions(dispatch);

		let newState = State();
		let rootReducer = MakeRootReducer();
		for (let action of actionsToDispatch) {
			newState = rootReducer(newState, action);
		}
		State_overrides.state = newState;
		State_overrides.countAsAccess = false;
		let newURL = GetNewURL();
		State_overrides.countAsAccess = null;
		State_overrides.state = null;

		to = newURL.toString();
	}
	return {
		//oldLocation: updateURLOnActions ? State(a=>a.router.location) : null,
		to,
	};
})
@ApplyBasicStyles
export default class Link extends BaseComponent<Props, {}> {
	handleClick(event) {
		let {onClick, to, target, replace: replaceURL, actions} = this.props;
		if (onClick) onClick(event);

		if (event.defaultPrevented) return; // onClick prevented default
		if (event.button !== 0) return; // ignore right clicks
		if (isModifiedEvent(event)) return; // ignore clicks with modifier keys

		if (actions) {
			event.preventDefault();
			actions(store.dispatch); // apply actions
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
			<a {...rest} onClick={this.handleClick} href={to} target={target}>
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
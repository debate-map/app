import * as React from 'react';
import { PropTypes } from "react";
import {BaseComponent} from "../UI/ReactGlobals";
import Radium from "radium";
import {replace, push} from "redux-little-router";

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

@Radium
export default class Link extends BaseComponent<{to, target?: string, replace?: boolean, style?, onClick?} & React.HTMLProps<HTMLAnchorElement>, {}> {
	handleClick(event) {
		if (this.props.onClick)
			this.props.onClick(event)

		if (!event.defaultPrevented && // onClick prevented default
				event.button === 0 && // ignore right clicks
				!this.props.target && // let browser handle "target=_blank" etc.
				!isModifiedEvent(event)) { // ignore clicks with modifier keys
			event.preventDefault()

			const {replace: replaceURL, to: toURL} = this.props
			if (replaceURL) {
				store.dispatch(replace(toURL));
			} else {
				store.dispatch(push(toURL));
			}
		}
	}

	render() {
		const {replace, to, ...rest} = this.props // eslint-disable-line no-unused-vars
		const href = this.context.router.history.createHref(typeof to === 'string' ? {pathname: to} : to)
		return <a {...rest} onClick={this.handleClick} href={href}/>
	}

	// add proxy, since using Radium
	setState(newState, callback?) {
		return this.SetState(newState, callback);
	}
}
//Link.prototype.setState = function(newState, callback?) { return this.SetState(newState, callback); }; // add proxy, since using Radium
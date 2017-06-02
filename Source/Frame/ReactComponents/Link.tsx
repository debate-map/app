import * as React from 'react';
import { PropTypes } from "react";
import {Link as LinkInner} from "react-router-dom";
import {BaseComponent} from "../UI/ReactGlobals";
import Radium from "radium";
import {historyStore} from "../../UI/Root";

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
	/*static contextTypes = {
		router: PropTypes.shape({
			history: PropTypes.shape({
				push: PropTypes.func.isRequired,
				replace: PropTypes.func.isRequired,
				createHref: PropTypes.func.isRequired
			}).isRequired
		}).isRequired
	};*/

	handleClick(event) {
		if (this.props.onClick)
			this.props.onClick(event)

		if (!event.defaultPrevented && // onClick prevented default
				event.button === 0 && // ignore right clicks
				!this.props.target && // let browser handle "target=_blank" etc.
				!isModifiedEvent(event)) { // ignore clicks with modifier keys
			event.preventDefault()

			//const {history} = this.context.router
			let history = historyStore;
			const {replace, to} = this.props

			if (replace) {
				history.replace(to)
			} else {
				history.push(to)
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
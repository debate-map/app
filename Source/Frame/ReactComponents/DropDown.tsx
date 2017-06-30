import {cloneElement} from "react";
import PropTypes from "prop-types";
import {BaseComponent, FindDOM, AddGlobalStyle} from "../UI/ReactGlobals";
import classNames from "classnames";

AddGlobalStyle(`
.dropdown {
    display: inline-block;
}
.dropdown__content {
    display: none;
    position: absolute;
}
.dropdown--active .dropdown__content {
    display: block;
}
`);

export default class DropDown extends BaseComponent<{className?, onShow?, onHide?} & React.HTMLProps<HTMLDivElement>, {active: boolean}> {
	ComponentDidMount() {
		window.addEventListener("click", this._onWindowClick);
		window.addEventListener("touchstart", this._onWindowClick);
	}

	ComponentWillUnmount() {
		window.removeEventListener("click", this._onWindowClick);
		window.removeEventListener("touchstart", this._onWindowClick);
	}

	constructor(props) {
		super(props);
		this.state = {
			active: false
		};
		this._onWindowClick = this._onWindowClick.bind(this);
		this._onToggleClick = this._onToggleClick.bind(this);
	}

	isActive() {
		return this.props.active != null ? this.props.active : this.state.active;
	}

	hide() {
		this.SetState({
			active: false
		}, ()=> {
			if (this.props.onHide) {
				this.props.onHide();
			}
		});
	}

	show() {
		this.SetState({
			active: true
		}, ()=> {
			if (this.props.onShow) {
				this.props.onShow();
			}
		});
	}

	_onWindowClick(event) {
		const dropdownElement = FindDOM(this);
		if (event.target !== dropdownElement && !dropdownElement.contains(event.target) && this.isActive()) {
			this.hide();
		}
	}
	_onToggleClick(event) {
		event.preventDefault();
		if (this.isActive()) {
			this.hide();
		} else {
			this.show();
		}
	}

	render() {
		const {children, className} = this.props;
		// create component classes
		const active = this.isActive();
		// stick callback on trigger element
		const boundChildren = React.Children.map(children, child => {
			if (child.type === DropDownTrigger) {
				const originalOnClick = child.props.onClick;
				child = cloneElement(child, {
					ref: "trigger",
					onClick: (event) => {
						this._onToggleClick(event);
						if (originalOnClick) {
							originalOnClick.apply(child, arguments);
						}
					}
				});
			}
			return child;
		});

		const cleanProps = {...this.props} as any;
		delete cleanProps.active;
		delete cleanProps.onShow;
		delete cleanProps.onHide;
		return (
			<div {...cleanProps} className={classNames("dropdown", {"dropdown--active": active}, className)}>
				{boundChildren}
			</div>
		);
	}
}

export class DropDownTrigger extends BaseComponent<{className?} & React.HTMLProps<HTMLDivElement>, {}> {
	render() {
		const {children, className, ...rest} = this.props;
		return (
			<div {...rest} className={classNames("dropdown__trigger", className)}>
				{children}
			</div>
		);
	}
}

export class DropDownContent extends BaseComponent<{className?, style?} & React.HTMLProps<HTMLDivElement>, {}> {
	render() {
		const {children, className, style, ...rest} = this.props;
		return (
			<div {...rest} className={classNames("dropdown__content", className)}
					style={E({padding: 10, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}, style)}>
				{children}
			</div>
		);
	}
}
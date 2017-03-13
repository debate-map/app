// React stuff
// ==========

import * as React from "react";
import {Component} from "react";
import * as ReactDOM from "react-dom";
import {WaitXThenRun, Timer} from "../General/Timers";
import autoBind from "react-autobind";
import {IsString} from "../General/Types";
import {Assert} from "../General/Assert";
import {E} from "../General/Globals_Free";

var ReactInstanceMap = require("react/lib/ReactInstanceMap");
export var ShallowCompare = require("react-addons-shallow-compare");
g.Extend({ShallowCompare});

g.Extend({React, Text});

export function FindDOM(comp) { return ReactDOM.findDOMNode(comp); };
export function FindDOM_(comp) { return $(FindDOM(comp)); };
g.Extend({FindDOM, FindDOM_});
export function FindReact(dom) {
    for (var key in dom)
        if (key.startsWith("__reactInternalInstance$")) {
            var compInternals = dom[key]._currentElement;
			var compWrapper = compInternals._owner;
            var comp = compWrapper._instance;
            return comp;
        }
    return null;
}
g.Extend({FindReact});

export class BaseComponent<P, S> extends Component<P & BaseProps, S> {
	constructor(props) {
		super(props);
		autoBind(this);
		this.state = this.state || {} as any;
	}

	timers = [] as Timer[];

	get FlattenedChildren() {
	    var children = this.props.children;
	    if (!(children instanceof Array))
	        children = [children];
	    return React.Children.map((children as any).Where(a=>a), a=>a);
	}

	/** safe force-update;*/
	Update(postUpdate?) {
		//if (!this.Mounted) return;
		this.forceUpdate(postUpdate);
	}
	Clear(postClear?) {
		var oldRender = this.render;
		this.render = function() {
			this.render = oldRender;
			//WaitXThenRun(0, this.Update);
			WaitXThenRun(0, ()=>this.Update());
			return <div/>;
		};
		postClear();
	}
	ClearThenUpdate() {
		//this.Clear(this.Update);
		this.Clear(()=>this.Update());
	}
	/** Shortcut for "()=>(this.forceUpdate(), this.ComponentWillMountOrReceiveProps(props))". */
	UpdateAndReceive(props) {
		return ()=> {
			//if (!this.Mounted) return;
			this.forceUpdate();
			if (this.autoRemoveChangeListeners)
				this.RemoveChangeListeners();
			this.ComponentWillMountOrReceiveProps(props)
		};
	}

	changeListeners = [];
	AddChangeListeners(host, ...funcs) {
		if (host == null) return; // maybe temp

	    /*host.extraMethods = funcs;
	    for (let func of funcs)
			this.changeListeners.push({host: host, func: func});*/
	    for (let func of funcs) {
			if (IsString(func))
				func = (func as any).Func(this.Update);
			// if actual function, add it (else, ignore entry--it must have been a failed conditional)
			if (func instanceof Function) {
				//if (!host.HasExtraMethod(func)) {
				host.extraMethod = func;
				this.changeListeners.push({host: host, func: func});
			}
		}
	}
	RemoveChangeListeners() {
		//this.changeListeners = this.changeListeners || []; // temp fix for odd "is null" issue
	    for (let changeListener of this.changeListeners)
	        changeListener.host.removeExtraMethod = changeListener.func;
	    this.changeListeners = [];
	}
	RemoveChangeListenersFor(host) {
	    var changeListenersToRemove = this.changeListeners.Where(a=>a.host == host);
	    for (let changeListener of changeListenersToRemove)
			changeListener.host.removeExtraMethod = changeListener.func;
	    this.changeListeners.RemoveAll(changeListenersToRemove);
	}

	autoRemoveChangeListeners = true;
	ComponentWillMount(): void {};
	ComponentWillMountOrReceiveProps(props: any, forMount?: boolean): void {};
	private componentWillMount() {
		if (this.autoRemoveChangeListeners)
			this.RemoveChangeListeners();
		this.ComponentWillMount(); 
	    this.ComponentWillMountOrReceiveProps(this.props, true); 
	}
	ComponentDidMount(...args: any[]): void {};
	ComponentDidMountOrUpdate(forMount: boolean): void {};
	mounted = false;
	private componentDidMount(...args) {
		this.ComponentDidMount(...args);
		this.ComponentDidMountOrUpdate(true);
		this.mounted = true;
		if (this.PostRender) {
			WaitXThenRun(0, ()=>window.requestAnimationFrame(()=> {
				if (!this.mounted) return;
			    this.PostRender(true);
			}));
			/*WaitXThenRun(0, ()=> {
				this.PostRender(true);
			});*/
		}
	}
	private componentWillUnmount() {
		for (let timer of this.timers)
			timer.Stop();
		this.timers = [];
		this.mounted = false;
	}
	
	ComponentWillReceiveProps(newProps: any[]): void {};
	private componentWillReceiveProps(newProps) {
		if (this.autoRemoveChangeListeners)
			this.RemoveChangeListeners();
		this.ComponentWillReceiveProps(newProps);
	    this.ComponentWillMountOrReceiveProps(newProps, false);
	}
	ComponentDidUpdate(...args: any[]): void {};
	private componentDidUpdate(...args) {
	    this.ComponentDidUpdate(...args);
		this.ComponentDidMountOrUpdate(false);
		if (this.PostRender) {
			WaitXThenRun(0, ()=>window.requestAnimationFrame(()=> {
			    if (!this.mounted) return;
			    this.PostRender(false);
			}));
			/*WaitXThenRun(0, ()=> {
				this.PostRender(false);
			});*/
		}
	}

	PostRender(initialMount: boolean): void {};

	// maybe temp
	/*get Mounted() {
	    return ReactInstanceMap.get(this) != null;
	}*/
}
//global.Extend({Component2: Component, BaseComponent: Component});

export function SimpleShouldUpdate(target) {
	target.prototype.shouldComponentUpdate = function(newProps, newState) {
	    return ShallowCompare(this, newProps, newState);
		/*var result = ShallowCompare(this, newProps, newState);
		g.Log(result + ";" + g.ToJSON(this.props) + ";" + g.ToJSON(newProps));
		return result;*/
	}
}

export type FirebaseDatabase = firebase.Database & FirebaseDatabase_Extensions;

export interface BaseProps {
	ml?; mr?; mt?; mb?;
	pl?; pr?; pt?; pb?;
	plr?; ptb?;

	tabLabel?: string; active?: boolean;

	page?; match?;
	firebase?: FirebaseDatabase;
}
export function BasicStyles(props) {
	var result: any = {};

	// old way
	/*for (let key in props) {
		if (key.startsWith("ml"))
			result.marginLeft = (key.startsWith("mlN") ? -1 : 1) * parseInt(key.substr(2));
		else if (key.startsWith("mr"))
			result.marginRight = (key.startsWith("mrN") ? -1 : 1) * parseInt(key.substr(2));
		else if (key.startsWith("mt"))
			result.marginTop = (key.startsWith("mtN") ? -1 : 1) * parseInt(key.substr(2));
		else if (key.startsWith("mb"))
			result.marginBottom = (key.startsWith("mbN") ? -1 : 1) * parseInt(key.substr(2));
		else if (key.startsWith("pl"))
			result.paddingLeft = (key.startsWith("plN") ? -1 : 1) * parseInt(key.substr(2));
		else if (key.startsWith("pr"))
			result.paddingRight = (key.startsWith("prN") ? -1 : 1) * parseInt(key.substr(2));
		else if (key.startsWith("pt"))
			result.paddingTop = (key.startsWith("ptN") ? -1 : 1) * parseInt(key.substr(2));
		else if (key.startsWith("pb"))
			result.paddingBottom = (key.startsWith("pbN") ? -1 : 1) * parseInt(key.substr(2));
	}*/

	var fullKeys = {
		ml: "marginLeft", mr: "marginRight", mt: "marginTop", mb: "marginBottom",
		pl: "paddingLeft", pr: "paddingRight", pt: "paddingTop", pb: "paddingBottom",
	};
	for (let key in props) {
		if (key in fullKeys) {
			let fullKey = fullKeys[key];
			result[fullKey] = props[key];
		} else if (key == "plr") {
			result.paddingLeft = props[key];
			result.paddingRight = props[key];
		} else if (key == "ptb") {
			result.paddingTop = props[key];
			result.paddingBottom = props[key];
		}
	}

	return result;
}

export class Span extends BaseComponent<{pre?} & React.HTMLProps<HTMLSpanElement>, any> {
    render() {
		var {pre, style, ...rest} = this.props;
        return <span {...rest} style={E(pre && {whiteSpace: "pre"}, style)}/>;
    }
}
g.Extend({Span});

export class Div extends BaseComponent<any, any> {
	shouldComponentUpdate(nextProps, nextState) {
		if (this.props.shouldUpdate)
			return this.props.shouldUpdate(nextProps, nextState);
	    return true;
	}
    render() {
        return <div {...this.props.Excluding("shouldUpdate")}/>;
    }
}
g.Extend({Div});

// todo: make Row and RowLR more consistent

export class Row extends BaseComponent<any, any> {
	render() {
		var {style, height, children, ...otherProps} = this.props;
		height = height != null ? height : (style||{}).height;
		return (
			<div {...otherProps} style={E(BasicStyles(this.props), style,
					//height != null ? {height} : {flex: 1})}>
					height != null && {height})}>
				{children}
			</div>
		);
	}
}
export class RowLR extends BaseComponent<{height?, className?, rowStyle?, leftStyle?, rightStyle?}, {}> {
    render() {
		var {height, className, rowStyle, leftStyle, rightStyle, children} = this.props;
        Assert((children as any).length == 2, "Row child-count must be 2. (one for left-side, one for right-side)");
		return (
			<div className={"row3 clear " + className} style={E({}, BasicStyles(this.props), height != null && {height}, rowStyle)}>
				<div style={E({float: "left", width: "50%"}, leftStyle)}>
					{children[0]}
				</div>
				<div style={E({float: "right", width: "50%"}, rightStyle)}>
					{children[1]}
				</div>
			</div>
        );
    }
}

export function Equals_Shallow(objA, objB) {
	if (objA === objB)
		return true;

	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	if (keysA.length !== keysB.length)
		return false;

	// Test for A's keys different from B.
	const hasOwn = Object.prototype.hasOwnProperty;
	for (let i = 0; i < keysA.length; i++) {
		if (!hasOwn.call(objB, keysA[i]) || objA[keysA[i]] !== objB[keysA[i]])
			return false;

		const valA = objA[keysA[i]];
		const valB = objB[keysA[i]];

		if (valA !== valB)
			return false;
	}

	return true;
}

//require("./GlobalStyles");

export function AddGlobalElement(str) {
    $(()=> {
        $(str).appendTo("#hidden_early");
    });
};
export function AddGlobalStyle(str) {
    AddGlobalElement(`
<style>
${str}
</style>
	`);
};

AddGlobalStyle(`
* {
	color: rgba(255,255,255,.7);
}
`);

//var classNames = require("classnames");
export function Classes(...entries: (string | {[s: string]: boolean})[]) {
	let result = "";
	for (let entry of entries) {
		if (IsString(entry)) {
			result += (result.length ? " " : "") + entry.trim();
		} else {
			for (let key in entry) {
				if (entry[key]) {
					result += (result.length ? " " : "") + key;
				}
			}
		}
	}
	return result;
}

/** Tunnels into Radium wrapper-class, and retrieves the original class, letting you access its static props. */
/*export function PreRadium<T>(typeGetterFunc: ()=>T, setFunc: Function): T {
	WaitXThenRun(0, ()=> {
		debugger;
		let type = typeGetterFunc() as any;
		setFunc(type.DecoratedComponent);
	});
	return {} as any;
}*/
/*export function PreRadium<T>(_: T, wrapperClass: Function): T {
	return (wrapperClass as any).DecoratedComponent;
}*/

export type RouteProps = {match};
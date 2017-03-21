import {Log} from "../General/Logging";
// React stuff
// ==========

import * as React from "react";
import {Component} from "react";
import * as ReactDOM from "react-dom";
import {WaitXThenRun, Timer} from "../General/Timers";
import autoBind from "react-autobind";
import {IsString} from "../General/Types";
import {Assert} from "../General/Assert";
import {E, Global} from "../General/Globals_Free";

var ReactInstanceMap = require("react/lib/ReactInstanceMap");
export var ShallowCompare = require("react-addons-shallow-compare");
g.Extend({ShallowCompare});

g.Extend({React, Text});

export function FindDOM(comp) { return ReactDOM.findDOMNode(comp) as HTMLElement; };
export function FindDOM_(comp) { return $(FindDOM(comp)) as JQuery; };
g.Extend({FindDOM, FindDOM_});
export function FindReact(dom) {
    for (var key in dom)
        if (key.startsWith("__reactInternalInstance$")) {
            var compInternals = dom[key]._currentElement;
			var compWrapper = compInternals._owner;
            var comp = compWrapper._instance;
            //return comp as React.Component<any, any>;
            return comp as BaseComponent<any, any>;
        }
    return null;
}
g.Extend({FindReact});
// needed for wrapper-components that don't provide way of accessing inner-component
export function GetInnerComp(wrapperComp: React.Component<any, any>) {
	return FindReact(FindDOM(wrapperComp));
}

export interface BaseProps {
	ml?; mr?; mt?; mb?;
	pl?; pr?; pt?; pb?;
	plr?; ptb?;

	tabLabel?: string; active?: boolean;

	page?; match?;
	firebase?: FirebaseDatabase;
}
var basePropFullKeys = {
	ml: "marginLeft", mr: "marginRight", mt: "marginTop", mb: "marginBottom",
	pl: "paddingLeft", pr: "paddingRight", pt: "paddingTop", pb: "paddingBottom",
	plr: null, ptb: null,

	tabLabel: null, active: null,

	page: null, match: null,
	firebase: null,
};
export function BasicStyles(props) {
	var result: any = {};

	for (let key in props) {
		if (key in basePropFullKeys) {
			let fullKey = basePropFullKeys[key];
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

export class BaseComponent<P, S> extends Component<P & BaseProps, S> {
	constructor(props) {
		super(props);
		autoBind(this);
		this.state = this.state || {} as any;

		// if using PreRender, wrap render func
		if (this.PreRender != BaseComponent.prototype.render) {
			let oldRender = this.render;
			this.render = function() {
				this.PreRender();
				return oldRender.apply(this, arguments);
			};
		}
	}

	refs;
	timers = [] as Timer[];

	get DOM() { return FindDOM(this); }
	get DOM_() { return $(this.DOM); }
	// needed for wrapper-components that don't provide way of accessing inner-component
	//get InnerComp() { return FindReact(this.DOM); }

	// make all these optional, so fits Component type definition/shape
	/*get FlattenedChildren() {
	    var children = this.props.children;
	    if (!(children instanceof Array))
	        children = [children];
	    return React.Children.map((children as any).Where(a=>a), a=>a);
	}*/

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

	/** Returns whether the new-state differs (shallowly) from the old-state. */
	SetState(newState: Partial<S>, callback?: ()=>any): boolean {
		let keys = this.state.VKeys().concat(newState.VKeys()).Distinct();
		if (!keys.Any(key=>(this.state as S)[key] !== (newState as S)[key])) return false;
		this.setState(newState as S, callback);
		return true;
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
		this.CallPostRender();
	}
	ComponentWillUnmount(): void {};
	private componentWillUnmount() {
		this.ComponentWillUnmount();
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
		this.CallPostRender();
	}

	private CallPostRender() {
		if (this.PostRender == BaseComponent.prototype.PostRender) return;
		let ownPostRender = this.PostRender as any;
		// can be different, for wrapped components (apparently they copy the inner type's PostRender as their own PostRender -- except as a new function, for some reason)
		let prototypePostRender = this.constructor.prototype.PostRender;
		if (ownPostRender.instant || prototypePostRender.instant)
			this.PostRender(true);
		else {
			WaitXThenRun(0, ()=>window.requestAnimationFrame(()=> {
				if (!this.mounted) return;
				this.PostRender(true);
			}));
			/*WaitXThenRun(0, ()=> {
				this.PostRender(true);
			});*/
		}
	}

	PreRender(): void {};
	PostRender(initialMount: boolean): void {};

	// maybe temp
	/*get Mounted() {
	    return ReactInstanceMap.get(this) != null;
	}*/
}
//global.Extend({Component2: Component, BaseComponent: Component});

export function SimpleShouldUpdate(target) {
	target.prototype.shouldComponentUpdate = function(newProps, newState) {
		/*if (ShallowCompare(this, newProps, newState))
			//Log("" + newProps.path);
			Log("Changed: " + this.props.Props.Where(a=>a.value !== newProps[a.name]).Select(a=>a.name));*/
	    return ShallowCompare(this, newProps, newState);
		/*var result = ShallowCompare(this, newProps, newState);
		g.Log(result + ";" + g.ToJSON(this.props) + ";" + g.ToJSON(newProps));
		return result;*/
	}
}

// for PostRender() func
export function Instant(target, name) {
	target[name].instant = true;
}

export type FirebaseDatabase = firebase.Database & FirebaseDatabase_Extensions;

@Global
export class Span extends BaseComponent<{pre?} & React.HTMLProps<HTMLSpanElement>, {}> {
    render() {
		var {pre, style, ...rest} = this.props;
		for (let key in basePropFullKeys)
			delete rest[key];
        return <span {...rest} style={E(BasicStyles(this.props), style, pre && {whiteSpace: "pre"})}/>;
    }
}

@Global
export class Div extends BaseComponent<{shouldUpdate?} & React.HTMLProps<HTMLDivElement>, {}> {
	shouldComponentUpdate(nextProps, nextState) {
		if (this.props.shouldUpdate)
			return this.props.shouldUpdate(nextProps, nextState);
	    return true;
	}
    render() {
		let {shouldUpdate, style, ...rest} = this.props;
		for (let key in basePropFullKeys)
			delete rest[key];
        return <div {...rest} style={E(BasicStyles(this.props), style)}/>;
    }
}

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

let loaded = false;
export function AddGlobalElement(html) {
	/*$(()=> {
        $(html).appendTo("#hidden_early");
    });*/
	let proceed = ()=> {
		loaded = true;
		let nodeType = html.trim().substring(1, html.trim().IndexOfAny(" ", ">"));
		let element = document.createElement(nodeType);
		document.querySelector("#hidden_early").appendChild(element);
		element.outerHTML = html;
	};
	if (loaded)
		proceed();
	else
		window.addEventListener("load", proceed);
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
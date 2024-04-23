import {enableES5, setAutoFreeze, setUseProxies} from "immer";
import {Assert, AssertWarn, CE, Clone, E, emptyArray, RemoveCircularLinks, ToJSON} from "js-vextensions";
import {autorun, computed, configure, observable, ObservableMap, ObservableSet, reaction, onReactionError, _getAdministration, keys as mobx_keys, get as mobx_get} from "mobx";
import {BailHandler, BailHandler_Options, RunInAction} from "mobx-graphlink"; // eslint-disable-line
import {observer} from "mobx-react";
//import {getAdministration, ObservableObjectAdministration, storedAnnotationsSymbol} from "mobx/dist/internal";
import type {ObservableObjectAdministration} from "mobx/dist/internal"; // for some reason, webpack breaks on actual/runtime imports of this (for production builds), so only import types
import {ComputedValue} from "mobx/dist/core/computedvalue.js";
import React, {Component, useRef} from "react";
import {EnsureClassProtoRenderFunctionIsWrapped} from "react-vextensions";
/*export function RunInAction(name: string, action: ()=>any) {
	 Object.defineProperty(action, "name", {value: name});
	 return runInAction(action);
}*/
import {createTransformer} from "mobx-utils";
import {HandleError} from "../General/Errors.js";

//import {useClassRef} from "react-universal-hooks";

// old: call ConfigureMobX() before any part of mobx tree is created (ie. at start of Store/index.ts); else, immer produce() doesn't work properly
//ConfigureMobX();

ConfigureMobX();
export function ConfigureMobX() {
	// configure({ enforceActions: 'always' });
	configure({enforceActions: "observed"});

	// have unhandled exceptions in mobx reactions sent to the global error-handler
	onReactionError((error, derivation)=>{
		HandleError(error);
	});

	// fixes various issues when Immer is sent mobx objects (see NPMPatches.ts for old fix attempts)
	enableES5(); // es5 mode is needed, since we're not using proxies
	setUseProxies(false);
	setAutoFreeze(false);
}

/** Useful for checking if the current call-stack is within a mobx computed value/function. (where mobx changes/side-effects are disallowed, eg. runInAction) */
/*export function MobXComputationDepth() {
	return _getGlobalState().computationDepth;
}*/

export type ActionFunc<StoreType> = (store: StoreType)=>void;

type IReactComponent = any; // temp
/** Variant of observer(...) wrapper-func, which returns a simple function result, instead of a ReactJS element-info entry. (*was* needed for ShowMessageBox.message; should be unnecessary now) */
export function observer_simple<T extends IReactComponent>(target: T): T {
	return observer(target as any)["type"];
}

// todo: probably rename/replace/rework @Observer decorator to be called @EnhancedComp or something (since it does more than just add mobx observer functionality, it also adds class-hooks and such)

// variant of @observer decorator, which also adds (and is compatible with) class-hooks (similar to mobx-graphlink's @ObserverMGL, but with more options)
export class Observer_Options {
	classHooks = true;

	/*mglObserver = true;
	mglObserver_opts?: ObserverMGL_Options;*/
	// from mobx-graphlink's @ObserverMGL
	bailHandler = true;
	bailHandler_opts?: BailHandler_Options;
}
export function Observer(targetClass: Function);
export function Observer(options: Partial<Observer_Options>);
export function Observer(...args) {
	let opts = new Observer_Options();
	if (typeof args[0] == "function") {
		ApplyToClass(args[0]);
	} else {
		opts = E(opts, args[0]);
		return ApplyToClass;
	}

	function ApplyToClass(targetClass: Function) {
		if (opts.classHooks) ClassHooks(targetClass);
		//if (targetClass instanceof (BaseComponent.prototype as any)) {
		if (targetClass.prototype.PreRender) {
			EnsureClassProtoRenderFunctionIsWrapped(targetClass.prototype);
		}
		/*if (opts.mglObserver) {
			ObserverMGL(opts.mglObserver_opts)(targetClass);
		} else {
			observer(targetClass as any);
		}*/
		if (opts.bailHandler) BailHandler(opts.bailHandler_opts)(targetClass);
		observer(targetClass as any);
	}
}

export function ClassHooks(targetClass: Function) {
	AssertWarn(targetClass.prototype.componentWillMount == null, "ClassHooks encountered a 'componentWillMount' method rather than UNSAFE_componentWillMount; ignoring/dropping its functionality.");
	const attachProp = targetClass.prototype.ComponentWillMount ? "ComponentWillMount" : "UNSAFE_componentWillMount";

	const componentWillMount_orig = targetClass.prototype[attachProp];
	targetClass.prototype[attachProp] = function() {
		const MAGIC_STACKS = GetMagicStackSymbol(this);
		if (!this[MAGIC_STACKS]) {
			// by initializing comp[MAGIC_STACKS] ahead of time, we keep react-universal-hooks from patching this.render
			this[MAGIC_STACKS] = {};
		}
		if (componentWillMount_orig) return componentWillMount_orig.apply(this, arguments);
	};

	const render_orig = targetClass.prototype.render;
	// note our patching Class.render, not instance.render -- this is compatible with mobx-react
	targetClass.prototype.render = function() {
		const MAGIC_STACKS = GetMagicStackSymbol(this);
		if (this[MAGIC_STACKS]) {
			// apply the stack-resetting functionality normally done in the on-instance patched this.render
			Object.getOwnPropertySymbols(this[MAGIC_STACKS]).forEach(k=>{
				this[MAGIC_STACKS][k] = 0;
			});
		}
		return render_orig.apply(this, arguments);
	};
}
let magicStackSymbol_cached: Symbol|undefined;
export function GetMagicStackSymbol(comp: Component) {
	if (magicStackSymbol_cached == null) {
		const instanceKey = React.version.indexOf("15") === 0 ? "_instance" : "stateNode";
		const ReactInternals = React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"];
		const compBeingRendered_real = ReactInternals.ReactCurrentOwner.current;

		const compBeingRendered_fake = {render: ()=>({})};
		ReactInternals.ReactCurrentOwner.current = {[instanceKey]: compBeingRendered_fake};
		// eslint-disable-next-line
		{
			//useClassRef(); // more straight-forward, but involves `require("react-universal-hooks")` from web-vcore, which is nice to be able to avoid
			/*const useRefIsModified = useRef["isModified"] ?? (useRef["isModified"] = useRef.toString().includes("useClassRef"));
			if (!useRefIsModified) throw new Error("Cannot get magic-stack symbol, because react-universal-hooks has not overridden the React.useRef function.");*/
			useRef(); // this triggers react-universal-hooks to attach data to the "comp being rendered" (fake object above)
		}
		ReactInternals.ReactCurrentOwner.current = compBeingRendered_real;

		// now we can obtain the secret magic-stacks symbol, by iterating the symbols on compBeingRendered_fake
		const symbols = Object.getOwnPropertySymbols(compBeingRendered_fake);
		const magicStackSymbol = symbols.find(a=>a.toString() == "Symbol(magicStacks)");
		magicStackSymbol_cached = magicStackSymbol;
	}
	return magicStackSymbol_cached as any; // needed for ts to allow as index
}

// todo: probably remove this; upcoming improvements to mobx-devtools-advanced and/or mobx-graphlink-devtools will make the "store call-details in action-name" behavior redundant
export function StoreAction<Func extends Function>(actionFunc: Func): Func & {Watch: Func};
export function StoreAction<Func extends Function>(name: string, actionFunc: Func): Func & {Watch: Func};
export function StoreAction(...args) {
	let name: string, actionFunc: Function;
	if (typeof args[0] == "function") [actionFunc] = args;
	else [name, actionFunc] = args;

	/* if (name) action["displayName"] = name;
	action["Watch"] = function(...callArgs) {
		//const accessor_withCallArgsBound = accessor.bind(null, ...callArgs); // bind is bad, because it doesn't "gobble" the "watcher" arg
		const action_withCallArgsBound = ()=>{
			//return accessor.apply(this, callArgs);
			return action(...callArgs);
			//return accessor_withProfiling(...callArgs);
		};
		if (name) action_withCallArgsBound["displayName"] = name;
		//outerAccessor["callArgs"] = callArgs;
		//outerAccessor["displayName"] = `${name || "Unknown"}(${callArgs.join(", ")})`;
		return Watch(action_withCallArgsBound, dependencies);
	};
	return action as any; */

	//let action_final = action(name, actionFunc);
	const result = (...callArgs)=>{
		let name_withArgs = name;
		name_withArgs += `(${callArgs.map(a=>(a != null ? ToJSON(a) : "null")).join(", ")})`;
		return RunInAction(name_withArgs, ()=>actionFunc(...callArgs));
	};
	// result["isStoreAction"] = true; // mark export as store-action (for copying into mobx-state-tree actions collection)
	return result;
}

const observableWarningGivenFor = new WeakSet<Function>();
export const O = ((target: Object, propertyKey: string | symbol)=>{
	//if (target.constructor instanceof Function && !target.constructor.toString().includes("makeObservable(")) {
	if (target.constructor instanceof Function && !target.constructor.toString().includes("makeObservable")) { // transpilation makes only the raw name safe to look for
		if (!observableWarningGivenFor.has(target.constructor)) {
			console.warn(`The @O decorator was used on "${target.constructor.name}.${String(propertyKey)
				}", but the class is missing the "makeObservable(this);" call. See here for more info: https://mobx.js.org/enabling-decorators.html`);
			observableWarningGivenFor.add(target.constructor);
		}
	}
	return observable(target, propertyKey);
}) as typeof observable;
// copy ".ref", etc. fields from "observable" (not wrapped)
for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(observable))) {
	Object.defineProperty(O, key, descriptor);
}

//export {RunInAction} from "mobx-graphlink";
export {RunInAction};

export function RunInAction_Set(setterFunc: ()=>any);
export function RunInAction_Set(classInstance: Object, setterFunc: ()=>any);
export function RunInAction_Set(...args) {
	let classInstance: Object|n, setterFunc: ()=>any;
	if (args.length == 1) [setterFunc] = args;
	else [classInstance, setterFunc] = args;

	const funcStr = setterFunc.toString();
	const funcStr_namePartMatch = funcStr.match(/(store.+?) /);
	const actionName = `Set${classInstance ? `@${classInstance.constructor.name}` : ""}:${funcStr_namePartMatch?.[1] ?? funcStr}`;
	RunInAction(actionName, setterFunc);
}

export var GetMobXStoredAnnotationSymbol_cached;
export function GetMobXStoredAnnotationSymbol(objectsPossiblyHavingSymbol: Object[]) {
	if (GetMobXStoredAnnotationSymbol_cached == null) {
		for (const obj of objectsPossiblyHavingSymbol) {
			if (obj == null) continue;
			//const newSymbol = ObjectCE(obj).FindSym("mobx-stored-annotations");
			const symbols = Object.getOwnPropertySymbols(obj);
			const matchingSymbol = symbols.find(a=>a.toString() == `Symbol(mobx-stored-annotations)`)!;
			if (matchingSymbol) {
				GetMobXStoredAnnotationSymbol_cached = matchingSymbol;
				break;
			}
		}
	}
	return GetMobXStoredAnnotationSymbol_cached;
}
export function GetMobXStoredAnnotations(mobxTree: Object) {
	const mobxTree_proto = mobxTree != null ? Object.getPrototypeOf(mobxTree) : null;
	//const symbol = storedAnnotationsSymbol;
	const symbol = GetMobXStoredAnnotationSymbol([mobxTree_proto, mobxTree]);
	// usually the actual annotations are on the class-prototype, so search there first
	if (mobxTree_proto?.[symbol] != null) return mobxTree_proto?.[symbol];
	// else, fall back to passed object itself
	return mobxTree?.[symbol];
}

// mobx-mirror
// ==========

export class GetMirrorOfMobXTree_Options {
	/** Most callers of GetMirrorOfMobXTree only care to have mobx-prop pathways mirrored, and excluding the rest improves perf substantially. */
	//onlyCopyMobXNodes = true;
	onlyCopyMobXProps = true;
	mirrorObservableRefs = false; // why is this false by default?

	/** If enabled, removes circular-links from mirror tree. This doesn't affect original object-tree, and makes the mirror tree usable in immer.produce(). */
	removeCircularLinks = false; // disabled by default, since onlyCopyMobXNodes is usually sufficient (and enabling this just adds some slowdown)
	/** List of classes for which instances in source-tree will have their copy-instances assigned the same prototype. */
	prototypesToKeep: Function[] = [Array, Map, Set];

	onChange?: (sourceObj: any, mirrorObj: any)=>void;
}

/**
Creates a deep copy of the object-tree passed in; for source nodes that are mobx objects, creates dynamically-updating "mirrors".
Purpose: Enables use of MobX object-trees as the source/base object for immer.produce(). (see: https://github.com/immerjs/immer/issues/515)
Important note: Due to technical reasons, the mobx-tree's "mirror" will be empty for the first call, *if* call-stack already in mobx mutate-batch (ie. globalState.inBatch > 0). Mirror will be populated just after call-stack completes.
*/
export function GetMirrorOfMobXTree<T>(mobxTree: T, opt = new GetMirrorOfMobXTree_Options()): T {
	if (mobxTree == null) return null as any;
	try {
		mobxTree["$mirror"];
	} catch (ex) {
		// if mere prop-access fails, we must have hit a different-domain frame context object, which prevents prop-access; just return empty object
		return {} as any;
	}

	if (mobxTree["$mirror"] == null) {
		const tree_plainMirror =
			Array.isArray(mobxTree) ? [] :
			mobxTree instanceof Map || mobxTree instanceof ObservableMap ? new Map() :
			mobxTree instanceof Set || mobxTree instanceof ObservableSet ? new Set() :
			{};
		if (CE(opt.prototypesToKeep).Any(a=>mobxTree instanceof a)) {
			Object.setPrototypeOf(tree_plainMirror, Object.getPrototypeOf(mobxTree));
		}

		if (Object.isExtensible(mobxTree)) {
			Object.defineProperty(mobxTree, "$mirror", {value: tree_plainMirror});
		}

		StartUpdatingMirrorOfMobXTree(mobxTree, tree_plainMirror, opt);
	}
	if (opt.removeCircularLinks) {
		RemoveCircularLinks(mobxTree["$mirror"]);
	}
	return mobxTree["$mirror"];
}

/** Wrapper around _getAdministration that returns null when encountering a non-mobx object, rather than erroring. */
export function GetAdministration_Safe(possibleMobXTree: any) {
	try {
		//return mobxTree[$mobx];
		return _getAdministration(possibleMobXTree) as ObservableObjectAdministration;
	} catch (ex) {
		return null;
	}
}

export function StartUpdatingMirrorOfMobXTree(mobxTree: any, tree_plainMirror: any, opt = new GetMirrorOfMobXTree_Options()) {
	//const stopUpdating = autorun(()=>{
	reaction(()=>{
		const sourceIsMap = mobxTree instanceof Map || mobxTree instanceof ObservableMap;
		const targetIsMap = tree_plainMirror instanceof Map || tree_plainMirror instanceof ObservableMap;
		const mobxInfo = GetAdministration_Safe(mobxTree);

		const keys = sourceIsMap ? mobxTree.keys() : Object.keys(mobxTree); // always access the keys, to ensure the autorun subscribes to them (using the mobx-admin-object path doesn't do this)
		//const keys = sourceIsMap || mobxInfo ? mobx_keys(mobxTree) : Object.keys(mobxTree); // always access the keys, to ensure the autorun subscribes to them (using the mobx-admin-object path doesn't do this)
		const mobxKeys =
			// if mobxTree is an Observable[Map/Set], then all of its keys are "mobx props"/reactive
			opt.onlyCopyMobXProps && !(mobxTree instanceof ObservableMap || mobxTree instanceof ObservableSet)
				//? mobxInfo?.keys_() ?? emptyArray
				// Why do we use x.values_.keys() rather than x.keys_()? Because the former works on both Map's and arrays.
				//? [...(mobxInfo?.values_?.keys() ?? emptyArray)] // converting to array makes debugging a bit nicer (fixes watch-panel glitch of showing no-items on 2nd+ views), but it's not necessary
				? mobxInfo?.values_?.keys() ?? emptyArray
				: keys;
		const mobxStoredAnnotations = GetMobXStoredAnnotations(mobxTree);

		for (const key of mobxKeys) {
			const valueFromSource = sourceIsMap ? mobxTree.get(key) : mobxTree[key]; // this counts as a mobx-get, meaning the autorun subscribes, so this func reruns when the prop-value changes
			//const valueFromSource = sourceIsMap || mobxInfo ? mobx_get(mobxTree, key) : mobxTree[key]; // this counts as a mobx-get, meaning the autorun subscribes, so this func reruns when the prop-value changes
			const fieldObservedAsRefOnly = mobxStoredAnnotations?.[key]?.annotationType_ == "observable.ref" || GetAdministration_Safe(valueFromSource) == null;

			let valueForTarget;
			if (typeof valueFromSource == "object" && valueFromSource != null && (opt.mirrorObservableRefs || !fieldObservedAsRefOnly)) {
				//if (!opt.onlyCopyMobXNodes || valueFromSource[$mobx] != null) {
				valueForTarget = GetMirrorOfMobXTree(valueFromSource, opt.removeCircularLinks ? E(opt, {removeCircularLinks: false}) : opt);
			} else {
				valueForTarget = valueFromSource;
			}

			if (targetIsMap) {
				tree_plainMirror.set(key, valueForTarget);
				//mobx_set(tree_plainMirror, key, valueForTarget);
			} else {
				tree_plainMirror[key] = valueForTarget;
			}

			//if (typeof valueForTarget_old == "object" && valueForTarget_old["$mirror_stopUpdating"]) { [...]
		}
	}, ()=>{
		opt.onChange?.(mobxTree, tree_plainMirror);
	}, {
		// this makes-so when reaction/first-func runs, the effect/second-func runs as well (we split them simply to prevent onChange from adding to the observed data)
		equals: ()=>false,
	});

	// attempted fix for first autorun call not immediately populating the mobx-mirror, if already in mobx mutate-batch (ie. when globalState.inBatch > 0) [canceled; too involved]
	/*{
		// args copied from: https://github.com/mobxjs/mobx/blob/0d28db8a0ba99f5cce744bb83b5bd88ec45a7e41/packages/mobx/src/api/autorun.ts#L50
		scheduler: new Reaction_AlwaysDoImmediately(
			name: "Autorun [using Reaction_AlwaysDoImmediately]", //name,
			function (this: Reaction) {
				 this.track(reactionRunner)
			},
			null, //opts.onError,
			opts.requiresObservable
	  ),
	});*/

	//Object.defineProperty(mobxTree, "$mirror_stopUpdating", stopUpdating);
}

/*export class Reaction_AlwaysDoImmediately extends Reaction {
	schedule_() {
		if (!this["isScheduled_"]) {
			this["isScheduled_"] = true
			globalState.pendingReactions.push(this)
			runReactions()
		}
  	}
}*/
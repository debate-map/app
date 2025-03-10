import React from "react";

export const reactInternals_newKey = "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE";
export const ReactInternals = React[reactInternals_newKey];
if (ReactInternals == null) throw new Error("React internals not found at expected path. (note: web-vcore requires react 19+ now)");
export function ReactInternals_GetActualCurrentOwner() { // exported, for debugging
	return ReactInternals.A.getOwner();
}

// custom polyfill for React.INTERNALS[...].ReactCurrentOwner, which allows for overrides (needed atm for retrieving the MAGIC_STACKS symbol from react-class-hooks; and for making it compatible with react 19, since the internals-path changed)
// ==========

export let React_currentOwner_override: object|null = null;
export function React_currentOwner_override_set(value: object|null) {
	React_currentOwner_override = value;
}

export const ReactInternals_PolyfillAtOldPath = {
	ReactCurrentOwner: {
		get current() {
			return React_currentOwner_override ?? ReactInternals_GetActualCurrentOwner();
		},
		/*set ReactCurrentOwner(value) {
			React_currentOwner_override = value;
		}*/
	},
	ReactCurrentDispatcher: {
		current: {
			readContext(context, observedBits) {
				return ReactInternals.H.readContext(context, observedBits);
			},
		},
	},
};
//window["ReactInternals_PolyfillAtOldPath"] = ReactInternals_PolyfillAtOldPath;

export const reactInternals_oldKey = "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED";
/** This must be called early in the import tree! Specifically, before react-class-hooks/react-universal-hooks caches the value at the old-path. */
export function Set_ReactInternals_PolyfillAtOldPath() {
	React[reactInternals_oldKey] = ReactInternals_PolyfillAtOldPath;
}
export function IsSet_ReactInternals_PolyfillAtOldPath() {
	return React[reactInternals_oldKey] === ReactInternals_PolyfillAtOldPath;
}
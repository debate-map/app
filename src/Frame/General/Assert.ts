import {TT} from "./Types";
import V from "../V/V";
import {Log} from "./Logging";

export function Assert(condition, messageOrMessageFunc?: string);
export function Assert(condition, messageOrMessageFunc?: Function);
export function Assert(condition, messageOrMessageFunc) {
	if (condition) return;

	var message = (messageOrMessageFunc as any) instanceof Function ? (messageOrMessageFunc as any)() : messageOrMessageFunc;

	Log(`Assert failed) ${message}\n\nStackTrace) ${V.GetStackTraceStr()}`);
	console.error("Assert failed) " + message);
	throw new Error("Assert failed) " + message);
};
export function AssertWarn(condition, messageOrMessageFunc) {
	if (condition) return;

	var message = messageOrMessageFunc instanceof Function ? messageOrMessageFunc() : messageOrMessageFunc;

	console.warn(`Assert-warn failed) ${message}\n\nStackTrace) ${V.GetStackTraceStr()}`);
};
g.Extend({Assert, AssertWarn});

export class A {
    static set NonNull(value) {
		Assert(value != null, `Value cannot be null. (provided value: ${value})`);
	}
	static NotEqualTo(val1) {
	    return new A_NotEqualTo_Wrapper(val1);
	}
	static OfType(typeNameOrType) {
	    var type = TT(typeNameOrType);
	    return new A_OfType_Wrapper(type);
	}
} 
export class A_NotEqualTo_Wrapper {
	constructor(val1) { this.val1 = val1; }
	val1;
    set a(val2) { Assert(val2 != this.val1); }
}
export class A_OfType_Wrapper {
	constructor(type) { this.type = type; }
	type;
    set a(val) { Assert(val != null && val.GetType().IsDerivedFrom(this.type)); }
}
g.Extend({A, A_NotEqualTo_Wrapper, A_OfType_Wrapper});
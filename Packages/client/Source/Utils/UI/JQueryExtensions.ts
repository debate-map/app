import {VRect} from "web-vcore/nm/js-vextensions";

declare global { interface JQuery { ToList(): JQuery[]; }}
$.fn.ToList = function(this: JQuery) { return this.toArray().map(a=>$(a)); };
declare global { interface JQuery { GetOffsetRect(): VRect; }}
$.fn.GetOffsetRect = function(this: JQuery) {
	return new VRect(this[0].clientLeft, this[0].clientTop, this.outerWidth(), this.outerHeight(), false);
};
declare global { interface JQuery { GetScreenRect(): VRect; }}
$.fn.GetScreenRect = function(this: JQuery) {
	const clientRect = this[0].getBoundingClientRect();
	return VRect.FromLTWH(clientRect);
};
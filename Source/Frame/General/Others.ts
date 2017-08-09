import {RemoveHelpers} from "../Database/DatabaseHelpers";

export function GetUpdates(oldData, newData, useNullInsteadOfUndefined = true) {
	let result = {};
	for (let key of oldData.VKeys(true).concat(newData.VKeys(true))) {
		if (newData[key] !== oldData[key]) {
			result[key] = newData[key];
			if (newData[key] === undefined && useNullInsteadOfUndefined) {
				result[key] = null;
			}
		}
	}
	return RemoveHelpers(result);
}

let _hScrollBarHeight;
export function GetHScrollBarHeight() {
	if (!_hScrollBarHeight) {
		let outer = $("<div style='visibility: hidden; position: absolute; left: -100; top: -100; height: 100; overflow: scroll;'/>").appendTo('body');
		let heightWithScroll = $("<div>").css({height: "100%"}).appendTo(outer).outerHeight();
		outer.remove();
		_hScrollBarHeight = 100 - heightWithScroll;
		//V._hScrollBarHeight = outer.children().height() - outer.children()[0].clientHeight;
	}
	return _hScrollBarHeight;
}
let _vScrollBarWidth;
export function GetVScrollBarWidth() {
	if (!_vScrollBarWidth) {
		let outer = $("<div style='visibility: hidden; position: absolute; left: -100; top: -100; width: 100; overflow: scroll;'/>").appendTo('body');
		let widthWithScroll = $("<div>").css({width: "100%"}).appendTo(outer).outerWidth();
		outer.remove();
		_vScrollBarWidth = 100 - widthWithScroll;
		//vScrollBarWidth = outer.children().width() - outer.children()[0].clientWidth + 1;
	}
	return _vScrollBarWidth;
}
export function HasScrollBar(control) { return HasVScrollBar(control) || HasHScrollBar(control); }
export function HasVScrollBar(control) { return control[0].scrollHeight > control[0].clientHeight; }
export function HasHScrollBar(control) { return control[0].scrollWidth > control[0].clientWidth; }
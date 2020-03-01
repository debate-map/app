import {GetContentWidth, GetContentHeight, GetAutoElement} from "js-vextensions";
import {ConvertStyleObjectToCSSString} from "react-vextensions";
import {MapNodeL3} from "@debate-map/server-link/Source/Link";
import {MapNodeType_Info} from "@debate-map/server-link/Source/Link";
import {GetNodeDisplayText, GetFontSizeForNode} from "@debate-map/server-link/Source/Link";

/* interface JQuery {
	positionFrom(referenceControl): void;
} */
/* setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
}); */

export function GetMeasurementInfoForNode(node: MapNodeL3, path: string) {
	const nodeTypeInfo = MapNodeType_Info.for[node.type];

	const displayText = GetNodeDisplayText(node, path);
	const fontSize = GetFontSizeForNode(node);
	const expectedTextWidth_tester = GetAutoElement(`<span style='${ConvertStyleObjectToCSSString({fontSize, whiteSpace: "nowrap"})}'>`) as HTMLElement;
	expectedTextWidth_tester.innerHTML = displayText;
	let expectedTextWidth = expectedTextWidth_tester.offsetWidth;

	let noteWidth = 0;
	if (node.current.note) {
		const noteWidth_tester = GetAutoElement(`<span style='${ConvertStyleObjectToCSSString({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>`) as HTMLElement;
		noteWidth_tester.innerHTML = node.current.note;
		noteWidth = Math.max(noteWidth, GetContentWidth(noteWidth_tester));
	}
	if (node.current.equation && node.current.equation.explanation) {
		const noteWidth_tester = GetAutoElement(`<span style='${ConvertStyleObjectToCSSString({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>`) as HTMLElement;
		noteWidth_tester.innerHTML = node.current.equation.explanation;
		noteWidth = Math.max(noteWidth, GetContentWidth(noteWidth_tester));
	}
	expectedTextWidth += noteWidth;

	// let expectedOtherStuffWidth = 26;
	let expectedOtherStuffWidth = 28;
	if (node.current.quote) {
		expectedOtherStuffWidth += 14;
	}
	let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;
	if (node.current.quote) { // quotes are often long, so just always do full-width
		expectedBoxWidth = nodeTypeInfo.maxWidth;
	}

	const width = node.current.widthOverride || expectedBoxWidth.KeepBetween(nodeTypeInfo.minWidth, nodeTypeInfo.maxWidth);

	const maxTextWidth = width - expectedOtherStuffWidth;
	const expectedTextHeight_tester = GetAutoElement(`<a id="nodeHeightTester" style='${ConvertStyleObjectToCSSString({whiteSpace: "initial", display: "inline-block"})}'>`) as HTMLElement;
	expectedTextHeight_tester.style.fontSize = `${fontSize}px`;
	expectedTextHeight_tester.style.width = `${maxTextWidth}px`;
	expectedTextHeight_tester.innerHTML = displayText;
	const expectedTextHeight = GetContentHeight(expectedTextHeight_tester);
	const expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
	// this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging

	return {expectedBoxWidth, width, expectedHeight};
}
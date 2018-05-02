import {MapNodeL3} from "Store/firebase/nodes/@MapNode";
import {MapNodeType_Info} from "Store/firebase/nodes/@MapNodeType";
import {GetNodeDisplayText, GetFontSizeForNode} from "Store/firebase/nodes/$node";
import {GetContentWidth, GetContentHeight, GetAutoElement} from "js-vextensions";
import {createMarkupForStyles} from "react-dom/lib/CSSPropertyOperations";

/*interface JQuery {
	positionFrom(referenceControl): void;
}*/
/*setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
});*/

export function GetMeasurementInfoForNode(node: MapNodeL3, path: string) {
	let nodeTypeInfo = MapNodeType_Info.for[node.type];

	let displayText = GetNodeDisplayText(node, path);
	let fontSize = GetFontSizeForNode(node);
	let expectedTextWidth_tester = GetAutoElement(`<span style='${createMarkupForStyles({fontSize, whiteSpace: "nowrap"})}'>`) as HTMLElement;
	expectedTextWidth_tester.innerHTML = displayText;
	let expectedTextWidth = expectedTextWidth_tester.offsetWidth;

	let noteWidth = 0;
	if (node.current.note) {
		let noteWidth_tester = GetAutoElement(`<span style='${createMarkupForStyles({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>`) as HTMLElement;
		noteWidth_tester.innerHTML = node.current.note;
		noteWidth = Math.max(noteWidth, GetContentWidth(noteWidth_tester));
	}
	if (node.current.equation && node.current.equation.explanation) {
		let noteWidth_tester = GetAutoElement(`<span style='${createMarkupForStyles({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>`) as HTMLElement;
		noteWidth_tester.innerHTML = node.current.equation.explanation;
		noteWidth = Math.max(noteWidth, GetContentWidth(noteWidth_tester));
	}
	expectedTextWidth += noteWidth;

	//let expectedOtherStuffWidth = 26;
	let expectedOtherStuffWidth = 28;
	if (node.current.contentNode) {
		expectedOtherStuffWidth += 14;
	}
	let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;
	if (node.current.contentNode) { // quotes are often long, so just always do full-width
		expectedBoxWidth = nodeTypeInfo.maxWidth;
	}

	let width = node.current.widthOverride || expectedBoxWidth.KeepBetween(nodeTypeInfo.minWidth, nodeTypeInfo.maxWidth);

	let maxTextWidth = width - expectedOtherStuffWidth;
	let expectedTextHeight_tester = GetAutoElement(`<a id="nodeHeightTester" style='${createMarkupForStyles({whiteSpace: "initial", display: "inline-block"})}'>`) as HTMLElement;
	expectedTextHeight_tester.style.fontSize = `${fontSize}px`;
	expectedTextHeight_tester.style.width = `${maxTextWidth}px`;
	expectedTextHeight_tester.innerHTML = displayText;
	let expectedTextHeight = GetContentHeight(expectedTextHeight_tester);
	let expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
	//this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging

	return {expectedBoxWidth, width, expectedHeight};
}
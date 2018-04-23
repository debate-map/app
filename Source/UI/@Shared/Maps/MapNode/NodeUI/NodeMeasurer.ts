import {MapNodeL3} from "Store/firebase/nodes/@MapNode";
import {MapNodeType_Info} from "Store/firebase/nodes/@MapNodeType";
import {GetNodeDisplayText, GetFontSizeForNode} from "Store/firebase/nodes/$node";
import {GetContentWidth, GetContentHeight} from "js-vextensions";
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
	let expectedTextWidth = GetContentWidth(`<span style='${createMarkupForStyles({fontSize, whiteSpace: "nowrap"})}'>${displayText}</span>`);

	let noteWidth = 0;
	if (node.current.note) {
		noteWidth = Math.max(noteWidth,
			GetContentWidth(`<span style='${createMarkupForStyles({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>${node.current.note}</span>`, true));
	}
	if (node.current.equation && node.current.equation.explanation) {
		noteWidth = Math.max(noteWidth,
			GetContentWidth(`<span style='${createMarkupForStyles({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>${node.current.equation.explanation}</span>`, true));
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
	let expectedTextHeight = GetContentHeight(`<a style='${
		createMarkupForStyles({fontSize, whiteSpace: "initial", display: "inline-block", width: maxTextWidth})
	}'>${displayText}</a>`);
	let expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
	//this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging

	return {expectedBoxWidth, width, expectedHeight};
}
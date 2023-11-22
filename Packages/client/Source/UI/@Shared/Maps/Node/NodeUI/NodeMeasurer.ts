import {GetFontSizeForNode, GetExpandedByDefaultAttachment, GetNodeDisplayText, NodeL3, NodeType_Info, GetSubPanelAttachments, Attachment, GetTitleIntegratedAttachment, Map, ShowNodeToolbar, NodeType, ChildGroup, GetToolbarItemsToShow} from "dm_common";
import {GetAutoElement, GetContentSize} from "web-vcore";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {GetMapState, GetPlayingTimeline} from "Store/main/maps/mapStates/$mapState";
import {GUTTER_WIDTH_SMALL, TOOLBAR_BUTTON_WIDTH} from "../NodeLayoutConstants";

/* interface JQuery {
	positionFrom(referenceControl): void;
} */
/* setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
}); */

/* keep func-name, for clearer profiling */ // eslint-disable-next-line
export const GetMeasurementInfoForNode = CreateAccessor(function GetMeasurementInfoForNode(node: NodeL3, path: string, map: Map, calcHeight = false) {
	const inBelowGroup = node.link?.c_parentType == NodeType.argument && node.link?.c_childType == NodeType.claim && node.link?.group == ChildGroup.generic;
	const leftMarginForLines = inBelowGroup ? GUTTER_WIDTH_SMALL : 0;

	const nodeTypeInfo = NodeType_Info.for[node.type];
	const maxWidth_normal = nodeTypeInfo.maxWidth;
	const maxWidth_final = maxWidth_normal - (leftMarginForLines != null ? leftMarginForLines : 0);

	const displayText = GetNodeDisplayText(node, path, map);
	const fontSize = GetFontSizeForNode(node, path);

	// old, dom-based measurements (slows down for large maps)
	/*const expectedTextWidth_tester = GetAutoElement(`<span style="position: absolute; font-size: ${fontSize}px; white-space: nowrap;">`) as HTMLElement;
	expectedTextWidth_tester.innerText = displayText;
	const expectedTextWidth1 = expectedTextWidth_tester.offsetWidth;*/

	// new, canvas-based measurements (doesn't slow down for large maps)
	let expectedTextWidth = GetTextWidth(displayText, GetCanvasFont(`${fontSize}px`));

	let noteWidth = 0;
	if (node.current.phrasing.note) {
		noteWidth = Math.max(noteWidth, GetTextWidth(node.current.phrasing.note, GetCanvasFont("11px")) + 15);
	}
	const titleAttachment = GetTitleIntegratedAttachment(node.current);
	if (titleAttachment?.equation && titleAttachment?.equation.explanation) {
		noteWidth = Math.max(noteWidth, GetTextWidth(titleAttachment?.equation.explanation, GetCanvasFont("11px")) + 15);
	}
	expectedTextWidth += noteWidth;

	const subPanelAttachments = GetSubPanelAttachments(node.current);
	//let expectedOtherStuffWidth = 26;
	let expectedOtherStuffWidth = 28;
	if (subPanelAttachments.Any(a=>a.quote != null || a.description != null)) {
		expectedOtherStuffWidth += 14;
	}
	if (node.type == NodeType.argument) {
		const toolbarItemsToShow_inline = GetToolbarItemsToShow(node, path, map).filter(a=>a.panel != "prefix"); // todo: confirm whether the filter op is correct here
		expectedOtherStuffWidth += (toolbarItemsToShow_inline.length * TOOLBAR_BUTTON_WIDTH); // add space for the inline toolbar-items (eg. "Relevance")
	}

	let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;
	if (subPanelAttachments.Any(a=>a.quote != null || a.description != null)) {
		//expectedBoxWidth = maxWidth_final;
		// these attachments are often long, so keep width at least 250 (just small enough so that, with relevance-button, argument-box fits in gap prior to toolbar of premise)
		expectedBoxWidth = expectedBoxWidth.KeepAtLeast(250);
	}

	// If playing timeline, always try to use the max-width for the given node-type. (so we have consistent widths, so that automatic scrolling+zooming can work consistently)
	// Exception: argument-nodes. We let these use dynamic-widths. Reason: They look really bad at max-width; and it's okay for this case, because they're not supposed to be used as focus-nodes anyway. (ie. for scrolling)
	const playingTimeline = GetPlayingTimeline(map.id);
	if (playingTimeline && node.type != NodeType.argument) {
		expectedBoxWidth = maxWidth_final;
	}

	const width = node.current.displayDetails?.widthOverride || expectedBoxWidth.KeepBetween(nodeTypeInfo.minWidth, maxWidth_final);

	let expectedHeight = -1;
	// todo: update this block to use canvas-based measurement as well
	if (calcHeight) {
		const maxTextWidth = width - expectedOtherStuffWidth;
		const expectedTextHeight_tester = GetAutoElement(`<a id="nodeHeightTester" style="position: absolute; white-space: initial; display: inline-block;">`) as HTMLElement;
		expectedTextHeight_tester.style.fontSize = `${fontSize}px`;
		expectedTextHeight_tester.style.width = `${maxTextWidth}px`;
		expectedTextHeight_tester.innerText = displayText;
		const expectedTextHeight = GetContentSize(expectedTextHeight_tester).height as number;
		expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
		//this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging
	}

	return {expectedBoxWidth, width, expectedHeight};
});

let textMeasurementCanvas: HTMLCanvasElement;
let textMeasurementCanvasContext: CanvasRenderingContext2D;
function GetTextWidth(text: string, font: string) {
	// re-use canvas object for better performance
	const canvas = textMeasurementCanvas ?? (textMeasurementCanvas = document.createElement("canvas"));
	const context = textMeasurementCanvasContext ?? (textMeasurementCanvasContext = canvas.getContext("2d")!);

	context.font = font;
	const metrics = context.measureText(text);
	return metrics.width;
}

function GetCSSStyle(element: HTMLElement, prop: string) {
	return window.getComputedStyle(element, null).getPropertyValue(prop);
}
function GetCanvasFont(fontSize?: string, fontFamily?: string, fontWeight?: number, elForValFallbacks: HTMLElement = document.body) {
	const fontSize_final = fontSize || GetCSSStyle(elForValFallbacks, "font-size") || "14px";
	const fontFamily_final = fontFamily || GetCSSStyle(elForValFallbacks, "font-family") || "Arial, sans-serif";
	const fontWeight_final = fontWeight || GetCSSStyle(elForValFallbacks, "font-weight") || "normal";
	return `${fontWeight_final} ${fontSize_final} ${fontFamily_final}`;
}
import {GetFontSizeForNode, GetExpandedByDefaultAttachment, GetNodeDisplayText, NodeL3, NodeType_Info, GetSubPanelAttachments, Attachment, GetTitleIntegratedAttachment, Map, ShowNodeToolbars, NodeType, ChildGroup} from "dm_common";
import {GetAutoElement, GetContentSize} from "web-vcore";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {ConvertStyleObjectToCSSString} from "web-vcore/nm/react-vextensions.js";
import {GetMapState, GetPlayingTimeline} from "Store/main/maps/mapStates/$mapState";
import {GUTTER_WIDTH_SMALL, TOOLBAR_BUTTON_WIDTH} from "../NodeLayoutConstants";
import {GetToolbarItemsToShow} from "../NodeBox/NodeToolbar";

/* interface JQuery {
	positionFrom(referenceControl): void;
} */
/* setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
}); */

export const GetMeasurementInfoForNode = CreateAccessor((node: NodeL3, path: string, map: Map)=>{
	const inBelowGroup = node.link?.c_parentType == NodeType.argument && node.link?.c_childType == NodeType.claim && node.link?.group == ChildGroup.generic;
	const leftMarginForLines = inBelowGroup ? GUTTER_WIDTH_SMALL : 0;

	const nodeTypeInfo = NodeType_Info.for[node.type];
	const maxWidth_normal = nodeTypeInfo.maxWidth;
	const maxWidth_final = maxWidth_normal - (leftMarginForLines != null ? leftMarginForLines : 0);

	const displayText = GetNodeDisplayText(node, path, map);
	const fontSize = GetFontSizeForNode(node, path);
	const expectedTextWidth_tester = GetAutoElement(`<span style='${ConvertStyleObjectToCSSString({fontSize, whiteSpace: "nowrap"})}'>`) as HTMLElement;
	expectedTextWidth_tester.innerHTML = displayText;
	let expectedTextWidth = expectedTextWidth_tester.offsetWidth;

	let noteWidth = 0;
	if (node.current.phrasing.note) {
		const noteWidth_tester = GetAutoElement(`<span style='${ConvertStyleObjectToCSSString({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>`) as HTMLElement;
		noteWidth_tester.innerHTML = node.current.phrasing.note;
		noteWidth = Math.max(noteWidth, GetContentSize(noteWidth_tester).width);
	}
	const titleAttachment = GetTitleIntegratedAttachment(node.current);
	if (titleAttachment?.equation && titleAttachment?.equation.explanation) {
		const noteWidth_tester = GetAutoElement(`<span style='${ConvertStyleObjectToCSSString({marginLeft: 15, fontSize: 11, whiteSpace: "nowrap"})}'>`) as HTMLElement;
		noteWidth_tester.innerHTML = titleAttachment?.equation.explanation;
		noteWidth = Math.max(noteWidth, GetContentSize(noteWidth_tester).width);
	}
	expectedTextWidth += noteWidth;

	const subPanelAttachments = GetSubPanelAttachments(node.current);
	// let expectedOtherStuffWidth = 26;
	let expectedOtherStuffWidth = 28;
	if (subPanelAttachments.Any(a=>a.quote != null || a.description != null)) {
		expectedOtherStuffWidth += 14;
	}
	if (node.type == NodeType.argument && ShowNodeToolbars(map)) {
		expectedOtherStuffWidth += (GetToolbarItemsToShow(node, map).length * TOOLBAR_BUTTON_WIDTH); // add space for the "Relevance" toolbar-item (if visible)
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

	const maxTextWidth = width - expectedOtherStuffWidth;
	const expectedTextHeight_tester = GetAutoElement(`<a id="nodeHeightTester" style='${ConvertStyleObjectToCSSString({whiteSpace: "initial", display: "inline-block"})}'>`) as HTMLElement;
	expectedTextHeight_tester.style.fontSize = `${fontSize}px`;
	expectedTextHeight_tester.style.width = `${maxTextWidth}px`;
	expectedTextHeight_tester.innerHTML = displayText;
	const expectedTextHeight = GetContentSize(expectedTextHeight_tester).height as number;
	const expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
	// this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging

	return {expectedBoxWidth, width, expectedHeight};
});
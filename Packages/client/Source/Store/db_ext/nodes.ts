import chroma, {Color} from "web-vcore/nm/chroma-js.js";
import {GetNodeChildrenL3, GetNodeRevisions, GetTimelineSteps, NodeL3, NodeRevision, NodeType, Polarity} from "dm_common";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {SLMode} from "UI/@SL/SL";
import {Chroma_Safe, HSLA} from "web-vcore";
import {Assert} from "js-vextensions";
import {store} from "Store";
import {NodeStyleRule, NodeStyleRule_IfType, NodeStyleRule_ThenType} from "Store/main/maps";
import {CE} from "web-vcore/nm/js-vextensions";
import {GetPlayingTimeline, GetPlayingTimelineAppliedStepIndex, GetPlayingTimelineRevealPaths_UpToAppliedStep, GetPlayingTimelineStepIndex} from "Store/main/maps/mapStates/$mapState";

export const nodeLightBackground = false;
//export const nodeLightBackground = true; // experimental; toggle on for testing

export function FixColor(color: chroma.Color) {
	// we must set an alpha on the color, if not set already (workaround for bug in chroma-js: calling darken/brighten/desaturate/etc. on color without alpha, returns "1" rather than a modified color)
	if (color.alpha() == undefined) color = color.alpha(1);
	return color;
}

export function GetNodeColor(node: RequiredBy<Partial<NodeL3>, "type">, type: "background" | "connector" = "background", allowOverrides = true): chroma.Color {
	let result: chroma.Color;

	/*if (node.type == NodeType.category) result = Chroma_Safe("hsl(210,15%,24%)");
	else if (node.type == NodeType.package) result = Chroma_Safe("hsl(195,35%,35%)");
	else if (node.type == NodeType.multiChoiceQuestion) result = Chroma_Safe("hsl(258,20%,45%)");
	else if (node.type == NodeType.claim) result = Chroma_Safe("hsl(210,10%,50%)");
	else if (node.type == NodeType.argument) {
		if (node.displayPolarity == Polarity.supporting) result = Chroma_Safe("hsl(120,25%,25%)");
		else if (node.displayPolarity == Polarity.opposing) result = Chroma_Safe("hsl(0,40%,25%)");
		else result = Chroma_Safe("hsl(210,15%,24%)");
	} else {
		Assert(false);
	}*/

	if (node.type == NodeType.category) result = Chroma_Safe("hsl(210,10%,24%)");
	else if (node.type == NodeType.package) result = Chroma_Safe("hsl(195,30%,35%)");
	else if (node.type == NodeType.multiChoiceQuestion) result = Chroma_Safe("hsl(258,20%,45%)");
	//else if (node.type == NodeType.claim) result = Chroma_Safe("hsl(208,55%,29%)");
	else if (node.type == NodeType.claim) result = Chroma_Safe("hsl(210,7%,45%)");
	else if (node.type == NodeType.argument) {
		//if (node.displayPolarity == Polarity.supporting) result = Chroma_Safe("hsl(120,20%,25%)");
		if (node.displayPolarity == Polarity.supporting) result = Chroma_Safe("hsl(120,18%,32%)");
		//else if (node.displayPolarity == Polarity.opposing) result = Chroma_Safe("hsl(0,35%,25%)");
		else if (node.displayPolarity == Polarity.opposing) result = Chroma_Safe("hsl(0,27%,32%)");
		else result = Chroma_Safe("hsl(210,10%,24%)");
	} else {
		Assert(false);
	}
	result = FixColor(result);

	/*if (nodeLightBackground) {
		if (node.type == NodeType.category) result = chroma("hsl(210,30%,70%)");
		else if (node.type == NodeType.package) result = chroma("hsl(195,40%,70%)");
		else if (node.type == NodeType.multiChoiceQuestion) result = chroma("hsl(258,15%,70%)");
		//else if (node.type == NodeType.claim) result = chroma("hsl(208,40%,70%)");
		else if (node.type == NodeType.claim) result = Chroma_Safe("hsl(210,10%,60%)");
		else if (node.type == NodeType.argument) {
			if (node.displayPolarity == Polarity.supporting) result = chroma("hsl(120,20%,70%)");
			else result = chroma("hsl(0,25%,70%)");
		} else {
			Assert(false);
		}
	}*/

	/*if (type == "background") {
		result = GetNodeBackgroundColorFromRawColor(result);
	}*/
	if (type == "connector") {
		// special case for claim nodes (color is too light; connector-lines actually have to be darkened)
		if (node.type == NodeType.claim) {
			//result = Chroma_Safe("hsla(210,7%,40%,1)");
			//result = result.darken(.3);
		} else {
			//result = GetNodeConnectorColorFromMainColor(result);
			result = result.brighten(.5);
		}
	}

	if (allowOverrides) {
		if (SLMode) {
			//result = chroma.mix(result, HSLA(0, 0, 1), .7); // mix result with white (70% white, 30% normal color)
			result = Chroma_Safe(HSLA(0, 0, 1));
		}

		if (node.current != null) {
			const styleRules = store.main.maps.nodeStyleRules;
			for (const rule of styleRules) {
				if (!rule.enabled) continue;
				if (rule.thenType != NodeStyleRule_ThenType.setBackgroundColor) continue;

				if (CE(rule).Cast(NodeStyleRule).DoesIfCheckPass(node)) {
					result = Chroma_Safe(rule.then_setBackgroundColor.color);
				}
			}
		}
	}

	result = FixColor(result);
	return result;
}
/*function GetNodeBackgroundColorFromRawColor(color: Color) {
	let result = chroma.mix(color, "black", 0.3); // mix background-color with black some
	result = result.alpha(0.9);
	return result;
}*/

export const GetNodeChildrenL3_Advanced = CreateAccessor((nodeID: string, path: string, mapID: string, includeMirrorChildren = true, tagsToIgnore?: string[], applyTimeline = false): NodeL3[]=>{
	path = path || nodeID;

	let nodeChildrenL3 = GetNodeChildrenL3(nodeID, path, includeMirrorChildren, tagsToIgnore);
	if (applyTimeline) {
		const playingTimeline = GetPlayingTimeline(mapID);
		const playingTimeline_steps = playingTimeline ? GetTimelineSteps(playingTimeline.id) : null;
		//const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(mapID);
		const playingTimeline_appliedStepIndex = GetPlayingTimelineAppliedStepIndex(mapID);
		//const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map.id);
		const playingTimelineVisiblePaths = GetPlayingTimelineRevealPaths_UpToAppliedStep(mapID, false); // false, so if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		if (playingTimeline && playingTimeline_steps != null && playingTimeline_appliedStepIndex != null && playingTimeline_appliedStepIndex < playingTimeline_steps.length - 1) {
			// for each child, if the child (or a descendent) is marked to be revealed by a currently-applied timeline-step, include the child in the revealed list/result
			nodeChildrenL3 = nodeChildrenL3.filter(child=>child != null && playingTimelineVisiblePaths.Any(a=>a.startsWith(`${path}/${child.id}`)));
		}
	}
	return nodeChildrenL3;
});
import chroma, {Color} from "web-vcore/nm/chroma-js.js";
import {GetNodeChildrenL3, GetNodeRevisions, NodeL3, NodeRevision, NodeType, Polarity} from "dm_common";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GADDemo} from "UI/@GAD/GAD";
import {Chroma_Safe, HSLA} from "web-vcore";
import {Assert} from "js-vextensions";
import {store} from "Store";
import {NodeStyleRule, NodeStyleRule_IfType, NodeStyleRule_ThenType} from "Store/main/maps";
import {CE} from "web-vcore/nm/js-vextensions";

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
		if (GADDemo) {
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

export const GetNodeChildrenL3_Advanced = CreateAccessor((nodeID: string, path: string, mapID: string, includeMirrorChildren = true, tagsToIgnore?: string[], applyAccessLevels = false, applyTimeline = false): NodeL3[]=>{
	path = path || nodeID;

	/*const nodeChildrenL2 = GetNodeChildrenL2(nodeID, includeMirrorChildren, tagsToIgnore);
	let nodeChildrenL3 = nodeChildrenL2.map(child=>(child ? GetNodeL3(`${path}/${child.id}`) : null));*/
	const nodeChildrenL3 = GetNodeChildrenL3(nodeID, path, includeMirrorChildren, tagsToIgnore);
	/*if (applyAccessLevels) {
		nodeChildrenL3 = nodeChildrenL3.filter(child=>{
			// if null, keep (so receiver knows there's an entry here, but it's still loading)
			if (child == null) return true;
			// filter out any nodes whose access-level is higher than our own
			//if (child.current.accessLevel > GetUserAccessLevel(MeID())) return false;
			// hide nodes that don't have the required premise-count
			// if (!IsNodeVisibleToNonModNonCreators(child, GetNodeChildren(child)) && !IsUserCreatorOrMod(MeID(), child)) return false;
			return true;
		});
	}*/
	/*if (applyTimeline) {
		const playingTimeline = GetPlayingTimeline(mapID);
		const playingTimeline_currentStepIndex = GetPlayingTimelineStepIndex(mapID);
		// const playingTimelineShowableNodes = GetPlayingTimelineRevealNodes_All(map.id);
		// const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(map.id, true);
		// if users scrolls to step X and expands this node, keep expanded even if user goes back to a previous step
		const playingTimelineVisibleNodes = GetPlayingTimelineRevealNodes_UpToAppliedStep(mapID);
		if (playingTimeline && playingTimeline_currentStepIndex < playingTimeline.steps.length - 1) {
			// nodeChildrenToShow = nodeChildrenToShow.filter(child => playingTimelineVisibleNodes.Contains(`${path}/${child.id}`));
			// if this node (or a descendent) is marked to be revealed by a currently-applied timeline-step, reveal this node
			nodeChildrenL3 = nodeChildrenL3.filter(child=>child != null && playingTimelineVisibleNodes.Any(a=>a.startsWith(`${path}/${child.id}`)));
		}
	}*/
	return nodeChildrenL3;
});

/*export const GetCurrentRevision = CreateAccessor((nodeID: string, path: string, mapID: string|n): NodeRevision=>{
	const revisions = GetNodeRevisions(nodeID);
	// todo: make this take into account the "current lens", etc.
	return revisions.OrderBy(a=>a.createdAt).Last();
});*/
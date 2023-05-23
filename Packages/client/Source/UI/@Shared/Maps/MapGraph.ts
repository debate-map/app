import {NodeType} from "dm_common";
import {useMemo} from "react";
import {Graph} from "tree-grapher";
import {ARG_MAX_WIDTH_FOR_IT_AND_ARG_BAR_TO_FIT_BEFORE_PREMISE_TOOLBAR, ARG_MAX_WIDTH_FOR_IT_TO_FIT_BEFORE_PREMISE_TOOLBAR, TOOLBAR_HEIGHT} from "./Node/NodeLayoutConstants";

export class NodeDataForTreeGrapher {
	constructor(data?: Partial<NodeDataForTreeGrapher>) {
		Object.assign(this, data);
	}
	nodeType?: NodeType;
	width?: number;
	expanded?: boolean;
	aboveToolbar_visible?: boolean;
	aboveToolbar_hasLeftButton?: boolean;
}

export function useGraph(forLayoutHelper: boolean) {
	const graphInfo = useMemo(()=>{
		const graph = new Graph({
			//uiDebugKit: {FlashComp},
			layoutOpts: {
				nodeSpacing: (nodeA, nodeB)=>{
					const nodeAParentPath = nodeA.data.path_parts.slice(0, -1).join("/");
					const nodeBParentPath = nodeB.data.path_parts.slice(0, -1).join("/");
					const nodeAData = nodeA.data.leftColumn_userData as NodeDataForTreeGrapher;
					const nodeBData = nodeB.data.leftColumn_userData as NodeDataForTreeGrapher;

					// if we have parent-argument's arg-control-bar above, and premise of that arg below, use regular spacing
					// (this logic breaks/causes-overlap if arg+premise1 have 4+ toolbar-buttons among them, but this is rare/unlikely enough to ignore for now)
					if (nodeAParentPath == nodeBParentPath && nodeAData.nodeType == null && nodeBData.nodeType == NodeType.claim) return 8;

					// standard spacing: if both are nodes, use 12; else use 8
					let standardSpacing = nodeAData.nodeType != null && nodeBData.nodeType != null ? 12 : 8;

					const nodeAIsArgOfNodeB = nodeB.data.leftColumn_connectorOpts.parentIsAbove && nodeAData.nodeType == NodeType.argument && nodeBData.nodeType == NodeType.claim && nodeA.data.path == nodeBParentPath;
					if (nodeAIsArgOfNodeB) standardSpacing = 5;

					// if node-b has toolbar above it, we may need to add extra spacing between the two nodes (since a node's toolbar isn't part of its "main rect" used for generic layout)
					if (nodeBData.aboveToolbar_visible) {
						// do special spacing between argument and its first premise (unless it has a left-aligned toolbar-button)
						if (nodeAIsArgOfNodeB && !nodeBData.aboveToolbar_hasLeftButton) {
							if (nodeAIsArgOfNodeB && (nodeAData.width ?? 0) > ARG_MAX_WIDTH_FOR_IT_TO_FIT_BEFORE_PREMISE_TOOLBAR) return TOOLBAR_HEIGHT + 8;
							if (nodeAIsArgOfNodeB && nodeAData.expanded && (nodeAData.width ?? 0) > ARG_MAX_WIDTH_FOR_IT_AND_ARG_BAR_TO_FIT_BEFORE_PREMISE_TOOLBAR) return TOOLBAR_HEIGHT + 8;
						} else {
							return TOOLBAR_HEIGHT + 8;
						}
					}

					return standardSpacing;
				},
				styleSetter_layoutPending: style=>{
					//style.right = "100%"; // not ideal, since can cause some issues (eg. during map load, the center-on-loading-nodes system can jump to empty left-area of map) 
					style.opacity = "0";
					style.pointerEvents = "none";
				},
				styleSetter_layoutDone: style=>{
					//style.right = "";
					style.opacity = "";
					style.pointerEvents = "";
				},
			},
		});
		// for debugging
		if (forLayoutHelper) {
			globalThis.layoutHelperGraph = graph;
		} else {
			globalThis.mainGraph = graph;
		}
		return graph;
	}, []);
	return graphInfo;
}
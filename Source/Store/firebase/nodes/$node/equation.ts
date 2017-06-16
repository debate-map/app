import {GetNodeChildren, GetNodeID, GetNode} from "../../nodes";
import {GetParentNode} from "Store/firebase/nodes";
import {GetLinkUnderParent} from "../$node";

export function GetEquationStepNumber(path: string) {
	let nodeID = GetNodeID(path);
	let parent = GetParentNode(path);
	//let equationStepNodeIDs = parent.children.VKeys(true).map(a=>a.ToInt());
	let equationStepNodes = GetNodeChildren(parent).filter(a=> {
		return a && a.equation && (GetLinkUnderParent(a._id, parent).seriesAnchor || a.equation.isStep);
	});
	// if node is not included "as a step" in this chain (ie. the series under this parent), return null
	if (!equationStepNodes.Any(a=>a._id == nodeID)) return null;

	if (parent.childrenOrder) {
		equationStepNodes = equationStepNodes.OrderBy(stepNode=>parent.childrenOrder.indexOf(stepNode._id).IfN1Then(Number.MAX_SAFE_INTEGER));
	}
	return equationStepNodes.map(a=>a._id).indexOf(nodeID) + 1;
}
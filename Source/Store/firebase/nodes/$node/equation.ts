import {GetParentNode} from "Store/firebase/nodes";
import {GetNodeChildren, GetNodeID, GetNode, GetNodeChildrenL2} from "../../nodes";
import {GetLinkUnderParent} from "../$node";

export function GetEquationStepNumber(path: string) {
	const nodeID = GetNodeID(path);
	const parent = GetParentNode(path);
	if (parent == null) return 0;

	// let equationStepNodeIDs = parent.children.VKeys(true).map(a=>a.ToInt());
	let equationStepNodes = GetNodeChildrenL2(parent).filter(a=>{
		return a && a.current.equation && (GetLinkUnderParent(a._key, parent).seriesAnchor || a.current.equation.isStep);
	});
	// if node is not included "as a step" in this chain (ie. the series under this parent), return null
	if (!equationStepNodes.Any(a=>a._key == nodeID)) return null;

	if (parent.childrenOrder) {
		equationStepNodes = equationStepNodes.OrderBy(stepNode=>parent.childrenOrder.indexOf(stepNode._key).IfN1Then(Number.MAX_SAFE_INTEGER));
	}
	return equationStepNodes.map(a=>a._key).indexOf(nodeID) + 1;
}
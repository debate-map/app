import {GetNodeChildLinks} from "../../nodeChildLinks.js";
import {GetNodeID, GetParentNode} from "../../nodes.js";

export function GetEquationStepNumber(path: string) {
	const nodeID = GetNodeID(path);
	const parent = GetParentNode(path);
	if (parent == null) return 0;

	const parentChildLinks = GetNodeChildLinks.BILA(parent.id);

	// let equationStepNodeIDs = parent.children.VKeys().map(a=>a.ToInt());
	/*let equationStepNodes = GetNodeChildrenL2(parent.id).filter(a=>{
		return a && a.current.equation && (parentChildLinks.find(b=>b.child == a.id).seriesAnchor || a.current.equation.isStep);
	});
	// if node is not included "as a step" in this chain (ie. the series under this parent), return null
	if (!CE(equationStepNodes).Any(a=>a.id == nodeID)) return null;

	if (parent.childrenOrder) {
		equationStepNodes = CE(equationStepNodes).OrderBy(stepNode=>CE(parent.childrenOrder.indexOf(stepNode.id)).IfN1Then(Number.MAX_SAFE_INTEGER));
	}
	return equationStepNodes.map(a=>a.id).indexOf(nodeID) + 1;*/

	return parentChildLinks.find(a=>a.child == nodeID)?.slot ?? null;
}
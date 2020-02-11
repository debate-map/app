import {GetLinkUnderParent} from "../$node";
import {GetNodeID, GetParentNode, GetNodeChildrenL2} from "../../nodes";
import {CE} from "js-vextensions";

export function GetEquationStepNumber(path: string) {
	const nodeID = GetNodeID(path);
	const parent = GetParentNode(path);
	if (parent == null) return 0;

	// let equationStepNodeIDs = parent.children.VKeys().map(a=>a.ToInt());
	let equationStepNodes = GetNodeChildrenL2(parent._key).filter(a=>{
		return a && a.current.equation && (GetLinkUnderParent(a._key, parent).seriesAnchor || a.current.equation.isStep);
	});
	// if node is not included "as a step" in this chain (ie. the series under this parent), return null
	if (!CE(equationStepNodes).Any(a=>a._key == nodeID)) return null;

	if (parent.childrenOrder) {
		equationStepNodes = CE(equationStepNodes).OrderBy(stepNode=>CE(parent.childrenOrder.indexOf(stepNode._key)).IfN1Then(Number.MAX_SAFE_INTEGER));
	}
	return equationStepNodes.map(a=>a._key).indexOf(nodeID) + 1;
}
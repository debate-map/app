import {GetNodeChildren, GetNodeID} from "../../nodes";
import {GetParentNode} from "Store/firebase/nodes";

export function GetEquationStepNumber(path: string) {
	let nodeID = GetNodeID(path);
	let parent = GetParentNode(path);
	//let equationStepNodeIDs = parent.children.VKeys(true).map(a=>a.ToInt());
	let equationStepNodes = GetNodeChildren(parent).filter(a=>a.equation);
	if (parent.childrenOrder) {
		equationStepNodes = equationStepNodes.OrderBy(stepNode=>parent.childrenOrder.indexOf(stepNode._id).IfN1Then(Number.MAX_SAFE_INTEGER));
	}
	return equationStepNodes.map(a=>a._id).indexOf(nodeID) + 1;
}
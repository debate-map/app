import {NodeLabel} from "./nodeLabels/@NodeLabel";
import {GetDocs, CreateAccessor} from "mobx-graphlink";

export const GetNodeLabels = CreateAccessor((nodeID: string): NodeLabel[]=>{
	return GetDocs({
		params: {
			filter: {
				nodeId: {equalTo: nodeID},
			}
		},
	}, a=>a.nodeLabels);
});

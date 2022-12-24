import {emptyArray, IsNaN} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {TitleKey} from "./nodePhrasings/@NodePhrasing.js";
import {NodeRevision} from "./nodes/@NodeRevision.js";

export function CleanNodeRevision<T extends(NodeRevision|n)>(source: T): T {
	if (source != null) {
		// the phrasing_tsvector field, when stringified, contains unusual unicode characters, which app-server is unable to write to the db;
		// thus, we strip that field at read-time, so we don't accidentally send it later on [it'd be useless to send anyway, since the server overwrites that field itself]
		delete source.phrasing_tsvector;
	}
	return source;
}

export const GetNodeRevision = CreateAccessor((id: string|n)=>{
	/*if (id == "HMemAFcKRtWjYcdktiGXGA") {
		debugger;
	}*/
	return CleanNodeRevision(GetDoc({}, a=>a.nodeRevisions.get(id!)));
});

// todo: make this use an actual query, to improve performance
// todo2 (nvm, canceled): actually, maybe instead just use approach used for map-node-phrasings (having separate db-path for each node's phrasing-collection) -- assuming it has no unforeseen issues

// removed this download-and-watch-whole-collection function because it slows down the website way too much
/* export function GetNodeRevisions(nodeID: string): NodeRevision[] {
	const entryMap = GetData({ collection: true }, 'nodeRevisions');
	return CachedTransform('GetNodeRevisions', [nodeID], entryMap, () => (entryMap ? entryMap.VValues(true).filter(a => a && a.node == nodeID) : []));
} */

/* export async function GetNodeRevisionIDsForNode_OneTime(nodeID: UUID) {
	let query = firestoreDB.collection(DBPath('nodeRevisions')) as CollectionReference | Query;
	query = query.where('node', '==', nodeID);

	const { docs } = await query.get();
	const docIDs = docs.map(a => a.id);
	return docIDs;
} */
export const GetNodeRevisions = CreateAccessor((nodeID: string): NodeRevision[]=>{
	/* const entryMap = GetData_Query(
		{
			// key: `GetNodeRevisions_${nodeID}`,
			WhereOps: [new WhereOp('node', '==', nodeID)],
			collection: true,
		},
		'nodeRevisions',
	);
	return entryMap ? entryMap.VValues(true).filter((a) => a && a.node == nodeID) : []; */
	// return entryMap ? entryMap.VValues(true).filter(a => a && a.node == nodeID) : [];
	return GetDocs({
		//queryOps: [new WhereOp("node", "==", nodeID)],
		params: {filter: {
			node: {equalTo: nodeID},
		}},
	}, a=>a.nodeRevisions).map(a=>CleanNodeRevision(a));
});
// commented for now, as support is not yet added for this type of "contains" filter (ie. targeting something within jsonb), in app-server
/*export const GetNodeRevisionsByTitle = CreateAccessor((title: string, titleKey: TitleKey = "text_base"): NodeRevision[]=>{
	return GetDocs({
		//queryOps: [new WhereOp(`titles.${titleKey}`, "==", title)],
		params: {filter: {
			phrasing: {contains: {[titleKey]: title}},
		}},
	}, a=>a.nodeRevisions);
});*/
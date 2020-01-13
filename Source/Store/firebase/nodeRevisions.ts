import {IsNaN} from "js-vextensions";
import {WhereFilter, GetDoc, GetDocs, StoreAccessor} from "mobx-firelink";
import {MapNodeRevision, TitleKey} from "./nodes/@MapNodeRevision";

export const GetNodeRevision = StoreAccessor(s=>(id: string): MapNodeRevision=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.nodeRevisions.get(id));
});

// todo: make this use an actual query, to improve performance
// todo2 (nvm, canceled): actually, maybe instead just use approach used for map-node-phrasings (having separate db-path for each node's phrasing-collection) -- assuming it has no unforeseen issues

// removed this download-and-watch-whole-collection function because it slows down the website way too much
/* export function GetNodeRevisions(nodeID: string): MapNodeRevision[] {
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
export const GetNodeRevisions = StoreAccessor(s=>(nodeID: string): MapNodeRevision[]=>{
	/* const entryMap = GetData_Query(
		{
			// key: `GetNodeRevisions_${nodeID}`,
			whereFilters: [new WhereFilter('node', '==', nodeID)],
			collection: true,
		},
		'nodeRevisions',
	);
	return entryMap ? entryMap.VValues(true).filter((a) => a && a.node == nodeID) : []; */
	// return entryMap ? entryMap.VValues(true).filter(a => a && a.node == nodeID) : [];
	return GetDocs({
		filters: [new WhereFilter("node", "==", nodeID)],
	}, a=>a.nodeRevisions);
});
export const GetNodeRevisionsByTitle = StoreAccessor(s=>(title: string, titleKey: TitleKey): MapNodeRevision[]=>{
	return GetDocs({
		filters: [new WhereFilter(`titles.${titleKey}`, "==", title)],
	}, a=>a.nodeRevisions);
});
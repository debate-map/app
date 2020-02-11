import _ from "lodash";
import {ObservableMap} from "mobx";
import {Clone} from "js-vextensions";
import {FirebaseDBShape} from "Subrepos/Server/Source/@Shared/Store/firebase";
import {globalMapID, globalRootNodeID} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNode";
import {GenerateUUID} from "mobx-firelink";
import {AddUpgradeFunc} from "../../Admin";

const newVersion = 12;
AddUpgradeFunc(newVersion, async(oldData, markProgress)=>{
	const data = Clone(oldData) as FirebaseDBShape;

	// clear outdated data
	// ==========

	data.general.data = {};
	delete data["nodeViewers"]; // removed due to privacy concerns
	delete data["userViewedNodes"]; // removed due to privacy concerns

	// collect ids to be converted into UUIDs, and generate new UUIDs for them
	// ==========

	type CollectionKey = "images" | "layers" | "maps" | "nodes" | "nodeRevisions" | "terms" | "termComponents" | "timelines" | "timelineSteps";
	type KeyConversion = {oldKey: string, newKey: string};
	const conversions = {
		images: [] as KeyConversion[],
		layers: [] as KeyConversion[],
		maps: [] as KeyConversion[],
		nodes: [] as KeyConversion[],
		// nodePhrasings: [] as KeyConversion[], // was using UUIDs before first usage
		nodeRevisions: [] as KeyConversion[],
		terms: [] as KeyConversion[],
		termComponents: [] as KeyConversion[],
		timelines: [] as KeyConversion[],
		timelineSteps: [] as KeyConversion[],
	};

	function GetNewKey(collectionKey: CollectionKey, oldEntryKey: string) {
		const conversionEntry = conversions[collectionKey].find(a=>a.oldKey == oldEntryKey);
		if (conversionEntry == null) {
			const placeholderKey = _.padEnd(oldEntryKey.toString().slice(0, 22), 22, "_MISSING");
			Log(`Found broken reference. CollectionKey:${collectionKey} OldEntryKey:${oldEntryKey} PlaceholderKey:${placeholderKey}`);
			return placeholderKey;
		}
		return conversionEntry.newKey;
	}

	conversions.VKeys().forEach(collectionKey=>{
		data[collectionKey].VValues().forEach(entry=>conversions[collectionKey].push({oldKey: entry._key, newKey: GenerateUUID()}));
	});
	// manually set newKey for global-map and global-root-node
	conversions.maps.find(a=>a.oldKey == "1").newKey = globalMapID;
	conversions.nodes.find(a=>a.oldKey == "1").newKey = globalRootNodeID;

	// convert heirarchal keys (ie. the primary key for each object, as present in the path)
	// ==========

	function ReplacePairKey(pairsObj: Object, oldKey: string, collectionReffedByKey: CollectionKey) {
		const newKey = GetNewKey(collectionReffedByKey, oldKey);
		const value = pairsObj[oldKey];
		delete pairsObj[oldKey];
		pairsObj[newKey] = value;
	}
	function ReplacePairKeys(pairsObj: Object, collectionReffedByKey: CollectionKey) {
		(pairsObj || {}).Pairs().forEach(pair=>ReplacePairKey(pairsObj, pair.key as string, collectionReffedByKey));
	}
	function ReplacePairValues(pairsObj: Object, collectionReffedByValue: CollectionKey) {
		(pairsObj || {}).Pairs().forEach(pair=>pairsObj[pair.key] = GetNewKey(collectionReffedByValue, pair.value));
	}

	/* conversions.VKeys().forEach((collectionKey) => {
		ReplacePairKeys(data[collectionKey], collectionKey as any);
	}); */

	// convert referential keys (ie. the key for each object, that is used within the prop of another object to refer to it)
	// ==========

	// ReplacePairKeys(data.layers, "images"); // no need, since already handled by earlier section "convert heirarchal keys"
	ReplacePairKeys(data.images, "images");

	ReplacePairKeys(data.layers, "layers");
	data.layers.VValues().forEach(entry=>{
		ReplacePairKeys(entry.mapsWhereEnabled, "maps");
		ReplacePairKeys(entry.nodeSubnodes, "nodes");
		(entry.nodeSubnodes || {}).VValues().forEach(subnodesMap=>{
			ReplacePairKeys(subnodesMap, "nodes");
		});
	});

	ReplacePairKeys(data.maps, "maps");
	data.maps.VValues().forEach(entry=>{
		ReplacePairKeys(entry.layers, "layers");
		if (entry.rootNode) entry.rootNode = GetNewKey("nodes", entry.rootNode);
		ReplacePairKeys(entry.timelines, "timelines");
	});
	ReplacePairKeys(data.mapNodeEditTimes, "maps");
	data.mapNodeEditTimes.VValues().forEach(entry=>{
		ReplacePairKeys(entry, "nodes");
	});

	ReplacePairKeys(data.nodes, "nodes");
	data.nodes.VValues().forEach(entry=>{
	// Array.from(data.nodes.values()).forEach((entry) => {
		const oldRevisionID = entry.currentRevision;

		ReplacePairKeys(entry.children, "nodes");
		if (entry.childrenOrder) entry.childrenOrder = entry.childrenOrder.map(childID=>GetNewKey("nodes", childID));
		entry.currentRevision = GetNewKey("nodeRevisions", entry.currentRevision);
		// entry.layerPlusAnchorParents; // skip, since no entries

		// try {
		ReplacePairKeys(entry.parents, "nodes");
		/* } catch (ex) {
			// if hit error, delete this node (assume orphaned and outdated)
			const newKey = GetNewKey('nodes', entry._key);
			delete data.nodes[newKey];
			console.log(`Deleted data.nodes[${newKey}] (${entry._key}) because it referenced a non-existent node. Text: ${data.nodeRevisions[oldRevisionID].titles.base}`);
		} */
	});
	ReplacePairKeys(data.nodeRatings, "nodes");
	ReplacePairKeys(data.nodeRevisions, "nodeRevisions");
	data.nodeRevisions.VValues().forEach(entry=>{
		if (entry.image) entry.image.id = GetNewKey("images", entry.image.id);
		// try {
		entry.node = GetNewKey("nodes", entry.node);
		/* } catch (ex) {
			// if hit error, delete this nodeRevision (assume orphaned and outdated)
			const newKey = GetNewKey('nodeRevisions', entry._key);
			delete data.nodeRevisions[newKey];
			console.log(`Deleted data.nodeRevision[${newKey}] (${entry._key}) because it referenced a non-existent node. Text: ${entry.titles.base}`);
		} */
	});
	// ReplacePairKeys(data.nodeViewers, 'nodes'); // skip nodeViewers, since removing it (privacy concerns)
	// ReplacePairKeys(data.nodePhrasings, 'nodePhrasings');
	data.nodePhrasings.VValues().forEach(entry=>{
		entry.node = GetNewKey("nodes", entry.node);
	});

	// skip terms, termComponents, and termNames, since no entries
	/* ReplacePairKeys(data.terms, 'terms');
	data.terms.VValues().forEach(... */

	// skip timelines and timelineSteps, since no entries
	/* ReplacePairKeys(data.timelineSteps, "timelineSteps");
	data.timelineSteps.VValues().forEach(... */

	// skip userMapInfo, since no entries
	// ...

	// skip userViewedNodes, since removing it (privacy concerns)
	// ...

	return data;
});
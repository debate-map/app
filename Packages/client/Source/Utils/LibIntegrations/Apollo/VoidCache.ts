import {ApolloCache, NormalizedCacheObject} from "web-vcore/nm/@apollo/client.js";

const emptyCacheObj = {};
export class VoidCache extends ApolloCache<NormalizedCacheObject> {
	init() {}
	resetResultCache(resetResultIdentities) {}
	restore(data) { return this; }
	extract(optimistic) { return emptyCacheObj; }
	read(options) { return null; }
	write(options) { return undefined; }
	modify(options) { return false; }
	diff(options) { return {}; }
	watch(watch) { return ()=>{}; }
	gc() { return [] as string[]; }
	retain(rootId, optimistic) {}
	release(rootId, optimistic) {}
	identify(object) { return undefined; }
	evict(options) { return false; }
	async reset() {}
	removeOptimistic(idToRemove) {}
	batch(options) {}
	performTransaction(update, optimisticId) {}
	transformDocument(document) { return document; }
	broadcastWatches(options) {}
	broadcastWatch(c, options) {}
}
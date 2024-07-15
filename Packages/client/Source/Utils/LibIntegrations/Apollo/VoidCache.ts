import {ApolloCache, NormalizedCacheObject, Cache} from "@apollo/client";

const emptyCacheObj = {};
export class VoidCache extends ApolloCache<NormalizedCacheObject> {
	read(options) { return null; }
	write(options) { return undefined; }
	diff(options) { return {}; }
	watch(watch) { return ()=>{}; }
	async reset() {} // eslint-disable-line
	evict(options) { return false; }
	restore(data) { return this; }
	extract(optimistic) { return emptyCacheObj; }
	removeOptimistic(id) {}
	batch(options) { return undefined as any; }
	performTransaction(update, optimisticId) {}
	recordOptimisticTransaction(transaction, optimisticId) {}
	transformDocument(document) { return document; }
	transformForLink(document) { return document; }
	identify(object) { return undefined; }
	gc() { return [] as string[]; }
	modify(options) { return false; }
	readQuery(options, optimistic?) { return null; }
	readFragment(options, optimistic?) { return null; }
	writeQuery(opts) { return undefined; }
	writeFragment(opts) { return undefined; }
	updateQuery(options, update) { return null; }
	updateFragment(options, update) { return null; }
}
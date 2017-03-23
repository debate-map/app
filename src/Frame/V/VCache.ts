var hasOwnProperty = Object.prototype.hasOwnProperty;
// Performs equality by iterating through keys on an object and returning false when any key has values which are not strictly equal between the arguments.
// Returns true when the values of all keys are strictly equal.
function shallowEqual(objA, objB) {
	if (Object.is(objA, objB))
		return true;
	if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null)
		return false;

	var keysA = Object.keys(objA);
	var keysB = Object.keys(objB);
	if (keysA.length !== keysB.length)
		return false;

	// test for A's keys different from B
	for (var i = 0; i < keysA.length; i++) {
		if (!hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) {
			return false;
		}
	}

	return true;
}




class Storage {
	lastDynamicProps;
	lastResult;
}
let storages = {} as {[storageKey: string]: Storage};

export function CachedTransform<T, T2, T3>(staticProps: T, dynamicProps: T2, transformFunc: (staticProps: T, dynamicProps: T2)=>T3) {
	let storageKey = JSON.stringify(staticProps);
	let storage = storages[storageKey] || (storages[storageKey] = new Storage());
	if (!shallowEqual(dynamicProps, storage.lastDynamicProps)) {
		storage.lastDynamicProps = dynamicProps;
		storage.lastResult = transformFunc(staticProps, dynamicProps);
	}
	return storage.lastResult;
}
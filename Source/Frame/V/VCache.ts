import {QuickIncrement} from "../General/Globals_Free";
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




class Storage<T2, T3> {
	lastDynamicProps: T2;
	lastResult: T3;
}
let storages = {} as {[storageKey: string]: Storage<any, any>};

/**
 * @param staticProps Can be either an object or array.
 * @param dynamicProps Can be either an object or array.
 * @param transformFunc The data-transformer. Whenever a dynamic-prop changes, this will be called, and the new result will be cached.
 */
export function CachedTransform<T, T2, T3>(staticProps: T, dynamicProps: T2, transformFunc: (staticProps: T, dynamicProps: T2)=>T3): T3;
export function CachedTransform<T, T2, T3>(transformType: string, staticProps: T, dynamicProps: T2, transformFunc: (staticProps: T, dynamicProps: T2)=>T3): T3;
export function CachedTransform<T, T2, T3>(...args) {
	let transformType: string, staticProps: T, dynamicProps: T2, transformFunc: (staticProps: T, dynamicProps: T2)=>T3;
	if (args.length == 3) {
		[staticProps, dynamicProps, transformFunc] = args;
		// if no transform-type specified, just use location of calling line of code
		transformType = new Error().stack.split("\n")[2];
		//transformType = (()=>{try {throw new Error();}catch(ex) {return ex.stack.split("\n")[3];}})(); // for ie
	} else {
		[transformType, staticProps, dynamicProps, transformFunc] = args;
	}

	let storageKey = transformType + "|" + JSON.stringify(staticProps);
	let storage = storages[storageKey] as Storage<T2, T3> || (storages[storageKey] = new Storage<T2, T3>());
	if (!shallowEqual(dynamicProps, storage.lastDynamicProps)) {
		//console.log(`Recalculating cache. @Type:${transformType} @StaticProps:${staticProps.VKeys()} @DynamicProps:${dynamicProps.VKeys()} @TransformFunc:${transformFunc}`);

		storage.lastDynamicProps = dynamicProps;
		storage.lastResult = transformFunc(staticProps, dynamicProps);
	}
	return storage.lastResult;
}
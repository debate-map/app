export function DMCommon_InServer() {
	return typeof global != "undefined";
}
export function DMCommon_InFrontend() {
	//return typeof window != "undefined";
	return !DMCommon_InServer();
}

// from: https://stackoverflow.com/a/57117594
// First, define a type that, when passed a union of keys, creates an object which cannot have those properties.
/*export type Impossible<K extends keyof any> = {
	[P in K]: never;
};
// The secret sauce! Provide it the type that contains only the properties you want, and then a type that extends that type, based on what the caller provided using generics.
export type NoExtraProperties<T, U extends T = T> = U & Impossible<Exclude<keyof U, keyof T>>;*/

// usage example:
/*function Example1<T extends Animal>(animal: NoExtraProperties<Animal, T>): void { ... }
const okay: NoExtraProperties<Animal> = {...};
*/

// not perfect (fails on last two test-lines below), but works for some basic cases
export type PickOnly<BaseType, KeysToKeep extends keyof BaseType> =
	{ [P in Exclude<keyof BaseType, KeysToKeep>]: never; }
	& { [P in KeysToKeep]: BaseType[P]; };

// test code
/*class IDAndName {
	id: number;
	name: string;
}

class ID {
	id: number;
}
type JustID = PickOnly<IDAndName, keyof ID>;

function acceptsJustID(justID: JustID) {}
function acceptsIDOrMore(idOrMore: ID) {
	acceptsJustID(idOrMore);
}

const shouldWork1 = {id: 1};
const shouldWork2: ID = {id: 2};
const shouldFail1 = {id: 3, name: "rat"};
const shouldFail2: IDAndName = {id: 4, name: "mouse"};

acceptsJustID(shouldWork1);
acceptsJustID(shouldWork2);
acceptsJustID(shouldFail1);
acceptsJustID(shouldFail2);

acceptsIDOrMore(shouldWork1);
acceptsIDOrMore(shouldWork2);
acceptsIDOrMore(shouldFail1);
acceptsIDOrMore(shouldFail2);*/

/** Used to let mobx-graphlink know that a given db-class' field needs to have its subfields included/expanded, in queries. */
export function MarkerForNonScalarField() {
	return {
		//$gqlType: className,
		// env-flag is temp-fix for usage in app-server-js; see ecosystem.config.js
		$gqlTypeIsScalar: (process.env.FORCE_ALL_DOC_FIELDS_SCALARS == "1" ? true : null) ?? false,
	};
}
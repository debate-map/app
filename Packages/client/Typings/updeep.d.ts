declare module Updeep {
	// Note, this does not support the curried versions of these functions.
	interface IStatic {
		// This is the main function.  Note that T should be a subtype of U.  But
		// there isn't a clean way to express this in TypeScript 1.6.x.  See
		// http://stackoverflow.com/questions/33703224/super-type-constraints-in-typescript
		<T extends {},U extends {}>(updates: U, obj: T): T;

		updateIn<T extends {}>(path: string | Array<string | number>, value: any, obj: T): T;

		constant<T extends {}>(obj: T): T;

		omit<T extends {}>(props: string[]): T;
	}
}

declare var updeep: Updeep.IStatic;

declare module "updeep" {
	export = updeep;
}
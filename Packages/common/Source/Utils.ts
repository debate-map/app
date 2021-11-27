export * from "./Utils/DB/PathFinder.js";
export * from "./Utils/DB/RatingProcessor.js";
export * from "./Utils/General/General.js";

// probably todo: remove these, and find way to specify it (infectiously) from web-vcore
declare global {
	type n = null | undefined;
	type nu = null;
	type un = undefined;

	type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
	type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
}
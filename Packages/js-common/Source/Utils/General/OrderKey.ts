import {generateKeyBetween} from "fractional-indexing";

export class OrderKey {
	static mid() {
		return new OrderKey(generateKeyBetween(null, null));
	}
	static between(x: OrderKey|string|n, y: OrderKey|string|n): OrderKey {
		const xStr = x instanceof OrderKey ? x.key : x;
		const yStr = y instanceof OrderKey ? y.key : y;
		// swap order when self is greater than other (base library enforces this restriction)
		if (xStr != null && yStr != null && xStr > yStr) {
			return OrderKey.between(yStr, xStr);
		}
		return new OrderKey(generateKeyBetween(xStr, yStr));
	}
	/** Throws an error if the key is invalid. */
	static validate(key: string) {
		// the base library's `validateOrderKey` function is private, so call its `generateKeyBetween` function instead (since it calls `validateOrderKey` internally)
		generateKeyBetween(key, null);
	}
	/** Returns an error message if the key is invalid; else returns null. */
	static validate_safe(key: string): string|null {
		try {
			OrderKey.validate(key);
			return null;
		} catch (ex) {
			return ex.toString(); //.replace("Error: ", "");
		}
	}

	key: string;

	constructor(str: string) {
		OrderKey.validate(str);
		this.key = str;
	}
	toString() {
		return this.key;
	}

	prev() {
		return new OrderKey(generateKeyBetween(null, this.key));
	}
	next() {
		return new OrderKey(generateKeyBetween(this.key, null));
	}
	between(other: OrderKey|string|n) {
		return OrderKey.between(this, other);
	}
}
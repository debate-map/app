import {generateKeyBetween} from "fractional-indexing";

export class OrderKey {
	static mid() {
		return new OrderKey(generateKeyBetween(null, null));
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
	between(other: OrderKey) {
		// swap order when self is greater than other (base library enforces this restriction)
		if (this.key > other.key) {
			return other.between(this);
		}
		return new OrderKey(generateKeyBetween(this.key, other.key));
	}
}
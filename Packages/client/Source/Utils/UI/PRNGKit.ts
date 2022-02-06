// from: https://stackoverflow.com/a/52171480
export function GetHashForString_cyrb53(str: String, seed = 0) {
	/* eslint-disable */
	let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		 ch = str.charCodeAt(i);
		 h1 = Math.imul(h1 ^ ch, 2654435761);
		 h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
	/* eslint-enable */
}

// based on: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
export class RNG_Mulberry32 {
	constructor(seed_int: number, stateShiftsForInit = 30) {
		this.state = seed_int;
		// go through X state-shifts before considering state initialized
		for (let i = 0; i < stateShiftsForInit; i++) {
			this.GetNextUint32();
		}
	}
	state: number;

	GetNextUint32() {
		/* eslint-disable */
		let t = this.state += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		//return ((t ^ t >>> 14) >>> 0) / 4294967296;
		return (t ^ t >>> 14) >>> 0;
		/* eslint-enable */
	}

	/** Returns a float between 0[inclusive] and 1[exclusive] -- like Math.random(). */
	GetNextFloat() {
		return this.GetNextUint32() / 4294967296;
	}
}
import React from "react";
export {};
Object.assign(window, {React});
// provide a global `React` (as a UMD global) for any module that references it without importing it.

// needed for @fast-csv/parser
// ==========

globalThis.process = globalThis.process ?? {};
process.nextTick = function(func, ...args) {
	//setTimeout(()=>func(...args), 0);
	const func_bound = func.bind(this, ...args);
	setTimeout(func_bound, 0);
};

globalThis["setImmediate" as any] = function(func, ...args) {
	const func_bound = func.bind(this, ...args);
	setTimeout(func_bound, 0);
};
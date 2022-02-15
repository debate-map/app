import React from "react";

Object.assign(window, {React}); declare global { const React: typeof React; }

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
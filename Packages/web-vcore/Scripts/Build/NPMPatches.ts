import {Options, Rule} from "webpack-string-replacer";
import webpack from "webpack";

type Options_WithAdditions = Options & {AddRule(rule: Rule): void};
const npmPatch_replacerConfig_base: Options_WithAdditions = {
	shouldValidate: ({compilations})=>compilations.length == 3, // only validate on initial compile
	// validationLogType: 'logError',
	rules: [],
	AddRule(rule: Rule) {
		const self = this as Options ?? npmPatch_replacerConfig_base;
		self.rules.push(rule);
	},
	webpackModule: webpack,
};
const AddRule = npmPatch_replacerConfig_base.AddRule;

// example string to match against:			const GetFocusedNodePath = (0,web_vcore_nm_mobx_graphlink__WEBPACK_IMPORTED_MODULE_3__.StoreAccessor)(s => mapViewOrMapID => {
const wpImport_pre = "\\(0,[a-zA-Z0-9_$]+?\\.";
const wpImport_post = "\\)";
const wpImport_pre_opt = `(${wpImport_pre})?`;
const wpImport_post_opt = `${wpImport_post}?`;

/*AddRule({
	fileInclude: [
		/\.jsx?$/,
		/(dm_common|Packages[/\\]common).+[/\\]Store[/\\]db[/\\].+\.ts$/,
	],
	replacements: [
		// make function-names of store-accessors accessible to watcher debug-info, for react-devtools
		{
			pattern: /const ([a-zA-Z0-9_$]+?) = StoreAccessor\(([^'"])/g,
			replacement(match, sub1, sub2, offset, string) {
				console.log("Match:", match, "\t\t\tNew:", `const ${sub1} = StoreAccessor("${sub1}", ${sub2}`);
				return `const ${sub1} = StoreAccessor("${sub1}", ${sub2}`;
			},
		},
		// make function-names of store-actions accessible at runtime
		{
			pattern: /const ([a-zA-Z0-9_$]+?) = StoreAction\(([^'"])/g,
			replacement(match, sub1, sub2, offset, string) {
				return `const ${sub1} = StoreAction("${sub1}", ${sub2}`;
			},
		},
	],
});*/
AddRule({
	applyStage: "optimizeChunkAssets", // regular "loader" stage causes webpack issues if used on modules from other packages in monorepo
	replacements: [
		// make function-names of accessors accessible, eg. for watcher debug-info, through react-devtools
		{
			// since we're in optimizeChunkAssets stage now, we need to account for webpack's transpilation of imports
			pattern: new RegExp(`const ([a-zA-Z0-9_$]+?) = (${wpImport_pre}CreateAccessor${wpImport_post})\\(([^'"])`, "g"),
			replacement(match, sub1, sub2, sub3, offset, string) {
				const result = `const ${sub1} = ${sub2}("${sub1}", ${sub3}`;
				//console.log("Match:", match, "\t\t\tNew:", result);
				return result;
			},
		},
		// make function-names of store-actions accessible at runtime
		{
			pattern: new RegExp(`const ([a-zA-Z0-9_$]+?) = (${wpImport_pre}StoreAction${wpImport_post})\\(([^'"])`, "g"),
			replacement(match, sub1, sub2, sub3, offset, string) {
				const result = `const ${sub1} = ${sub2}("${sub1}", ${sub3}`;
				//console.log("Match:", match, "\t\t\tNew:", result);
				return result;
			},
		},
	],
});

// AddStringReplacement(/connected-(draggable|droppable).js$/, [
// AddRule({
// 	fileInclude: /react-beautiful-dnd.esm.js$/,
// 	// logFileMatches: true,
// 	fileMatchCount: 1,
// 	replacements: [
// 		// make lib support nested-lists better (from: https://github.com/atlassian/react-beautiful-dnd/pull/636)
// 		/*{
// 			pattern: /function getDroppableOver\$1\(_ref2\) (.|\n)+?(?=var offsetRectByPosition)/,
// 			patternMatchCount: 1,
// 			// logAroundPatternMatches: 100,
// 			replacement: ()=>{
// 				return `
// 					function getDroppableOver$1(args) {
// 						var pageBorderBox = args.pageBorderBox, target = args.draggable, droppables = args.droppables;
// 						var maybe = toDroppableList(droppables)
// 							.filter(droppable => {
// 								if (!droppable.isEnabled) return false;
// 								var active = droppable.subject.active;
// 								if (!active) return false;
// 								return isPositionInFrame(active)(target);
// 							})
// 							.sort((a, b) => {
// 								// if draggable is over two lists, and one's not as tall, have it prioritize the list that's not as tall
// 								/*if (a.client.contentBox[a.axis.size] < b.client.contentBox[b.axis.size]) return -1;
// 								if (a.client.contentBox[a.axis.size] > b.client.contentBox[b.axis.size]) return 1;
// 								return 0;*#/
// 								if (a.client.contentBox[a.axis.size] != b.client.contentBox[b.axis.size]) {
// 									return a.client.contentBox[a.axis.size] - b.client.contentBox[b.axis.size]; // ascending
// 								}

// 								// if draggable is over two lists, have it prioritize the list farther to the right
// 								/*if (a.client.contentBox.left != b.client.contentBox.left) {
// 									return a.client.contentBox.left - b.client.contentBox.left; // ascending
// 								}*#/

// 								// if draggable is over multiple lists, have it prioritize the list whose center is closest to the mouse
// 								/*var aDist = Math.hypot(target.x - a.client.contentBox.center.x, target.y - a.client.contentBox.center.y);
// 								var bDist = Math.hypot(target.x - b.client.contentBox.center.x, target.y - b.client.contentBox.center.y);
// 								return aDist - bDist; // ascending*#/

// 								// prioritize the list farther to the right/bottom (evaluated as distance from union-rect top-left)
// 								var unionRect = {x: Math.min(a.client.contentBox.left, b.client.contentBox.left), y: Math.min(a.client.contentBox.top, b.client.contentBox.top)};
// 								var aDist = Math.hypot(unionRect.x - a.client.contentBox.center.x, unionRect.y - a.client.contentBox.center.y);
// 								var bDist = Math.hypot(unionRect.x - b.client.contentBox.center.x, unionRect.y - b.client.contentBox.center.y);
// 								return -(aDist - bDist); // descending
// 							})
// 							.find(droppable => !!droppable);
// 						return maybe ? maybe.descriptor.id : null;
// 					}
// 				`.trim();
// 			},
// 		},*/
// 		{
// 			pattern: `
//   return getFurthestAway({
//     pageBorderBox: pageBorderBox,
//     draggable: draggable,
//     candidates: candidates
//   });
//   			`.trim(),
// 			patternMatchCount: 1,
// 			// logAroundPatternMatches: 100,
// 			replacement: ()=>{
// 				return `
// 					const maybe = candidates
// 						.sort((a, b) => {
// 							// if draggable is over two lists, and one's not as tall, have it prioritize the list that's not as tall
// 							/*if (a.client.contentBox[a.axis.size] < b.client.contentBox[b.axis.size]) return -1;
// 							if (a.client.contentBox[a.axis.size] > b.client.contentBox[b.axis.size]) return 1;
// 							return 0;*/
// 							if (a.client.contentBox[a.axis.size] != b.client.contentBox[b.axis.size]) {
// 								return a.client.contentBox[a.axis.size] - b.client.contentBox[b.axis.size]; // ascending
// 							}

// 							// if draggable is over two lists, have it prioritize the list farther to the right
// 							/*if (a.client.contentBox.left != b.client.contentBox.left) {
// 								return a.client.contentBox.left - b.client.contentBox.left; // ascending
// 							}*/

// 							// if draggable is over multiple lists, have it prioritize the list whose center is closest to the mouse
// 							/*var aDist = Math.hypot(target.x - a.client.contentBox.center.x, target.y - a.client.contentBox.center.y);
// 							var bDist = Math.hypot(target.x - b.client.contentBox.center.x, target.y - b.client.contentBox.center.y);
// 							return aDist - bDist; // ascending*/

// 							// prioritize the list farther to the right/bottom (evaluated as distance from union-rect top-left)
// 							var unionRect = {x: Math.min(a.client.contentBox.left, b.client.contentBox.left), y: Math.min(a.client.contentBox.top, b.client.contentBox.top)};
// 							var aDist = Math.hypot(unionRect.x - a.client.contentBox.center.x, unionRect.y - a.client.contentBox.center.y);
// 							var bDist = Math.hypot(unionRect.x - b.client.contentBox.center.x, unionRect.y - b.client.contentBox.center.y);
// 							return -(aDist - bDist); // descending
// 						})
// 						.find(droppable=>!!droppable);
// 					return maybe ? maybe.descriptor.id : null;
// 				`.trim();
// 			},
// 		},

// 		// disable map edge-scrolling, when option is set
// 		{
// 			// pattern: /var canScrollDroppable = function canScrollDroppable\(droppable, change\) {/,
// 			pattern: /var canScrollDroppable = function canScrollDroppable.+/g,
// 			patternMatchCount: 1,
// 			replacement: ()=>`
// 				var canScrollDroppable = function canScrollDroppable(droppable, change) {
// 					if (window.LockMapEdgeScrolling && window.LockMapEdgeScrolling()) return false;
// 			`.trim(),
// 		},
// 	],
// });

// react
/* AddStringReplacement(/ReactDebugTool.js/, [
	{
		// expose ReactDebugTool.getTreeSnapshot
		pattern: /module.exports = /g,
		replacement: (match, offset, string) => Clip(`
ReactDebugTool.getTreeSnapshot = getTreeSnapshot;

module.exports =
			`),
	},
]); */

// make all Object.defineProperty calls leave the property configurable (probably better to just wrap the Object.defineProperty function)
/* AddStringReplacement(/index\.js$/, [
	{
		pattern: /enumerable: true,/g,
		replacement(match, offset, string) {
			return `${match} configurable: true,`;
		},
	},
]); */

// firebase-mock
/* AddStringReplacement(/firebase-mock\/src\/storage-file.js/, [
	{
		// remove "fs" require
		pattern: /require\('fs'\)/g,
		replacement: (match, offset, string) => {
			console.log('=== Replaced fs line. ===');
			return '{}';
		},
	},
]); */

// immer
// commented; we don't need this anymore, since we have the mobx-mirror system now
/*AddRule({
	fileInclude: /immer.module.js$/,
	// logFileMatches: true,
	// logFileMatchContents: true,
	// fileMatchCount: 2, // one for root/immer, another for web-vcore/immer (make sure to run "npm link web-vcore")
	fileMatchCount: 1,
	replacements: [
		// makes-so immer accept any object in its "produce" function (so we don't need to add the "[immerable] = true" markers)
		{
			pattern: "function isDraftable(value) {",
			patternMatchCount: 1,
			replacement: "function isDraftable(value) { return value != null;",
		},
		// makes-so when traversing down path with getter-setters, immer proceeds instead of halting
		{
			pattern: "function shallowCopy(base, invokeGetters) {",
			patternMatchCount: 1,
			// logAroundPatternMatches: 100,
			replacement: "function shallowCopy(base, invokeGetters) { invokeGetters = true;",
		},
		// immer expects draftable objects to not have getter-setters; this change makes immer compatible, by having it always use Object.defineProperty (instead of sometimes using "clone[key] =", which breaks things)
		{
			pattern: "clone[key] = value;",
			patternMatchCount: 1,
			replacement: `
				Object.defineProperty(clone, key, {
					value: value,
					writable: true,
					configurable: true,
					enumerable: true
				});
			`,
		},
		// The below fixes are only needed if using proxies. Fixing all the issues is tricky however (never completed), so we just disable the use of proxies (in Store/index.ts).
		// ==========
		/* // now that objects with getter-setters are draftable (used as state.base), fix immer trying to add incompatible "writable" attr to prop-descriptor, in objectTraps.getOwnPropertyDescriptor (called from shallowCopy)
		{
			pattern: 'desc.writable = true;',
			patternMatchCount: 1,
			replacement: 'if (desc.get == null && desc.set == null) desc.writable = true;',
		}, */
		// probably due to our sending objects with getter-setters into immer, immer breaks on "store.feedback.[...]"; the change below fixes that issue (not sure of details atm)
		/* {
			pattern: 'if (value !== peek$1(state.base, prop)) { return value; }',
			patternMatchCount: 1,
			replacement: `
				if (peek$1(state.base, prop) === undefined) {
					if (drafts == null) drafts = {...state.copy};
					return drafts[prop] = createProxy$1(value, state);
				}
				if (value !== peek$1(state.base, prop)) { return value; }
			`,
		}, *#/
	],
});*/

export function CreateNPMPatchesConfig(ext: Partial<Options>): Options_WithAdditions {
	const config = {
		...npmPatch_replacerConfig_base,
		...ext,
	};
	return config;
}
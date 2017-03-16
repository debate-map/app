import {Log} from "../General/Logging";
import {Assert} from "../../Frame/General/Assert";
import {IsPrimitive, IsString} from "../General/Types";

export default class V {
	static minInt = Number.MIN_SAFE_INTEGER;
	static maxInt = Number.MAX_SAFE_INTEGER;
	//static emptyString_truthy = []; // not really a string, but ([] + "") == "", and [] is truthy (ie, !![] == true)

	static Distance(point1, point2) {
		var width = Math.abs(point2.x - point1.x);
		var height = Math.abs(point2.y - point1.y); 
		return Math.sqrt(width * width + height * height);
	}

	static AsArray(args) { return V.Slice(args, 0); };
	//s.ToArray = function(args) { return s.Slice(args, 0); };
	static Slice(args, start, end?) { return Array.prototype.slice.call(args, start != null ? start : 0, end); };

	static PropNameToTitle(propName: string) {
		// demo string: somePropName
		return propName
			// somePropName -> some prop name
			.replace(/[A-Z]/g, a=>" " + a.toLowerCase())
			// some prop name -> Some prop name
			.replace(/^./, a=>a.toUpperCase());
	}

	/*static startupInfo = null;
	static startupInfoRequested = false;
	static postStartupInfoReceivedFuncs = [];
	static WaitForStartupInfoThenRun(func) {
		if (startupInfo)
			func(startupInfo);
		else
			V.postStartupInfoReceivedFuncs.push(func);
	}*/
	
	// example:
	// var multilineText = V.Multiline(function() {/*
	//		Text that...
	//		spans multiple...
	//		lines.
	// */});
	static Multiline(functionWithInCommentMultiline, useExtraPreprocessing) {
		useExtraPreprocessing = useExtraPreprocessing != null ? useExtraPreprocessing : true;

		var text = functionWithInCommentMultiline.toString().replace(/\r/g, "");

		// some extra preprocessing
		if (useExtraPreprocessing) {
			text = text.replace(/@@.*/g, ""); // remove single-line comments
			//text = text.replace(/@\**?\*@/g, ""); // remove multi-line comments
			text = text.replace(/@\*/g, "/*").replace(/\*@/g, "*/"); // fix multi-line comments
		}

		var firstCharPos = text.indexOf("\n", text.indexOf("/*")) + 1;
		return text.substring(firstCharPos, text.lastIndexOf("\n"));
	}
	static Multiline_NotCommented(functionWithCode) {
		var text = functionWithCode.toString().replace(/\r/g, "");
		var firstCharOfSecondLinePos = text.indexOf("\n") + 1;
		var enderOfSecondLastLine = text.lastIndexOf("\n");
		var result = text.substring(firstCharOfSecondLinePos, enderOfSecondLastLine);

		result = result.replace(/\t/g, "    ");
		// replace the start and end tokens of special string-containers (used for keeping comments in-tact)
		result = result.replace(/['"]@((?:.|\n)+)@['"];(\n(?=\n))?/g, (match, sub1)=>sub1.replace(/\\n/, "\n"));

		return result;
	}

	static StableSort(array, compare) { // needed for Chrome
		var array2 = array.map((obj, index)=>({index: index, obj: obj}));
		array2.sort((a, b)=> {
			var r = compare(a.obj, b.obj);
			return r != 0 ? r : V.Compare(a.index, b.index);
		});
		return array2.map(pack=>pack.obj);
	}
	static Compare(a, b, caseSensitive = true) {
		if (!caseSensitive && typeof a == "string" && typeof b == "string") {
			a = a.toLowerCase();
			b = b.toLowerCase();
		}
		return a < b ? -1 : (a > b ? 1 : 0);
	}

	// just use the word 'percent', even though value is represented as fraction (e.g. 0.5, rather than 50[%])
	static Lerp(from, to, percentFromXToY) { return from + ((to - from) * percentFromXToY); }
	static GetPercentFromXToY(start, end, val, clampResultTo0Through1 = true) {
		// distance-from-x / distance-from-x-required-for-result-'1'
		var result = (val - start) / (end - start);
		if (clampResultTo0Through1)
			result = result.KeepBetween(0, 1);
		return result;
	}

	static GetXToY(minX, maxY, interval = 1) {
		var result = [];
		for (var val = minX; val <= maxY; val += interval) {
			result.push(val);
		}
		return result;
	}
	static GetXToYOut(minX, maxOutY, interval = 1) {
		var result = [];
		for (var val = minX; val < maxOutY; val += interval) {
			result.push(val);
		}
		return result;
	}

	static CloneObject(obj, propMatchFunc?: Function, depth = 0) {
	    Assert(depth < 100, "CloneObject cannot work past depth 100! (probably circular ref)");

		if (obj == null)
			return null;
		if (IsPrimitive(obj))
			return obj;
		//if (obj.GetType() == Array)
		if (obj.constructor == Array)
			return V.CloneArray(obj);
		if (obj instanceof List)
			return List.apply(null, [obj.itemType].concat(V.CloneArray(obj)));
	    if (obj instanceof Dictionary) {
	        let result = new Dictionary(obj.keyType, obj.valueType);
	        for (let pair of obj.Pairs)
	            result.Add(pair.key, pair.value);
	        return result;
	    }

	    let result = {};
		for (let prop of obj.Props)
			if (!(prop.value instanceof Function) && (propMatchFunc == null || propMatchFunc.call(obj, prop.name, prop.value)))
				result[prop.name] = V.CloneObject(prop.value, propMatchFunc, depth + 1);
		return result;
	}
	static CloneArray(array) {
		//array.slice(0); //deep: JSON.parse(JSON.stringify(array));
		return Array.prototype.slice.call(array, 0);
	}
	/*static IsEqual(a, b) {
		function _equals(a, b) { return JSON.stringify(a) === JSON.stringify($.extend(true, {}, a, b)); }
		return _equals(a, b) && _equals(b, a);
	};*/

	static GetStackTraceStr(stackTrace?: string, sourceStackTrace?: boolean);
	static GetStackTraceStr(sourceStackTrace?: boolean);
	static GetStackTraceStr(...args) {
	    if (IsString(args[0])) var [stackTrace, sourceStackTrace = true] = args;
	    else var [sourceStackTrace = true] = args;

		//stackTrace = stackTrace || new Error()[sourceStackTrace ? "Stack" : "stack"];
		stackTrace = stackTrace || new Error().stack;
		return stackTrace.substr(stackTrace.IndexOf_X(1, "\n")); // remove "Error" line and first stack-frame (that of this method)
	}
	static LogStackTrace() { Log(V.GetStackTraceStr()); }

	static Bind<T extends Function>(func: T, newThis: any): T {
		return func.bind(newThis);
	}

	/*static ForEachChildInTreeXDoY(treeX: any, actionY: (value, key: string)=>void) {
		for (let key in treeX) {
			let value = treeX[key];
			actionY(value, key);
			if (typeof value == "object" || value instanceof Array)
				V.ForEachChildInTreeXDoY(value, actionY);
		}
	}*/
	static GetKeyValuePairsInObjTree(obj: any, ancestorPairs = []) {
		type pair = {ancestorPairs, obj, prop, value};
		let result = [] as {ancestorPairs: pair[], obj, prop, value}[];
		for (let key in obj) {
			let value = obj[key];
			let currentPair = {ancestorPairs, obj, prop: key, value};
			result.push(currentPair);
			result.AddRange(V.GetKeyValuePairsInObjTree(value, ancestorPairs.concat(currentPair)));
		}
		return result;
	}
}
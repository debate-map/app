// String
// ==========

interface String { TrimStart(...chars: string[]): string; }
String.prototype._AddFunction_Inline = function TrimStart(this: string, ...chars: string[]) {
	// fix for if called by VDF (which has a different signature)
	if (arguments[0] instanceof Array) chars = arguments[0];

	for (var iOfFirstToKeep = 0; iOfFirstToKeep < this.length && chars.Contains(this[iOfFirstToKeep]); iOfFirstToKeep++);
	return this.slice(iOfFirstToKeep, this.length);
};
interface String { TrimEnd(...chars: string[]): string; }
String.prototype._AddFunction_Inline = function TrimEnd(this: string, ...chars: string[]) {
	for (var iOfLastToKeep = this.length - 1; iOfLastToKeep >= 0 && chars.Contains(this[iOfLastToKeep]); iOfLastToKeep--);
	return this.substr(0, iOfLastToKeep + 1);
};

//interface String { Contains: (str)=>boolean; }
String.prototype._AddFunction_Inline = function Contains(str, /*;optional:*/ startIndex) { return -1 !== String.prototype.indexOf.call(this, str, startIndex); };
String.prototype._AddFunction_Inline = function hashCode() {
	var hash = 0;
	for (var i = 0; i < this.length; i++) {
		var char = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0; // convert to 32-bit integer
	}
	return hash;
};
interface String {
	Matches(str: string): {index: number}[];
	Matches(regex: RegExp): RegExpMatchArray[];
}
String.prototype._AddFunction_Inline = function Matches(strOrRegex: string | RegExp) {
	if (typeof strOrRegex == "string") {
		let str = strOrRegex;
		let result = [] as {index: number}[];
		let lastMatchIndex = -1;
		while (true) {
			let matchIndex = this.indexOf(str, lastMatchIndex + 1);
			if (matchIndex == -1) // if another match was not found
				break;
			result.push({index: matchIndex});
			lastMatchIndex = matchIndex;
		}
		return result;
	}

	let regex = strOrRegex;
	if (!regex.global)
		throw new Error("Regex must have the 'g' flag added. (otherwise an infinite loop occurs)");

	let result = [] as RegExpMatchArray[];
	let match;
	while (match = regex.exec(this))
		result.push(match);
	return result;
};
/*String.prototype._AddFunction_Inline = function matches_group(regex, /*o:*#/ groupIndex) {
	if (!regex.global)
		throw new Error("Regex must have the 'g' flag added. (otherwise an infinite loop occurs)");

	groupIndex = groupIndex || 0; // default to the first capturing group
	var matches = [];
	var match;
	while (match = regex.exec(this))
		matches.push(match[groupIndex]);
	return matches;
};*/
interface String { IndexOf_X: (str: string, indexX: number)=>number; }
/** indexX is 0-based */
String.prototype._AddFunction_Inline = function IndexOf_X(str: string, indexX: number) {
	var currentPos = -1;
	for (var i = 0; i <= indexX; i++) {
		var subIndex = this.indexOf(str, currentPos + 1);
		if (subIndex == -1)
			return -1; // no such xth index
		currentPos = subIndex;
	}
	return currentPos;
};
interface String { IndexOf_X: (str: string, indexFromLastX: number)=>number; }
/** indexFromLastX is 0-based */
String.prototype._AddFunction_Inline = function IndexOf_XFromLast(str: string, indexFromLastX: number) {
	var currentPos = (this.length - str.length) + 1; // index just after the last-index-where-match-could-occur
	for (var i = 0; i <= indexFromLastX; i++) {
		var subIndex = this.lastIndexOf(str, currentPos - 1);
		if (subIndex == -1)
			return -1; // no such xth index
		currentPos = subIndex;
	}
	return currentPos;
};
interface String { IndexOfAny: (...strings: string[])=>number; }
String.prototype._AddFunction_Inline = function IndexOfAny(this: string, ...strings: string[]) {
	var lowestIndex = -1;
	for (let str of strings) {
		var indexOfChar = this.indexOf(str);
		if (indexOfChar != -1 && (indexOfChar < lowestIndex || lowestIndex == -1))
			lowestIndex = indexOfChar;
	}
	return lowestIndex;
};
interface String { LastIndexOfAny: (...strings: string[])=>number; }
String.prototype._AddFunction_Inline = function LastIndexOfAny(this: string, ...strings: string[]) {
	var highestIndex = -1;
	for (let str of strings) {
		var indexOfChar = this.lastIndexOf(str);
		if (indexOfChar > highestIndex)
			highestIndex = indexOfChar;
	}
	return highestIndex;
};
interface String { StartsWithAny: (...strings: string[])=>boolean; }
String.prototype._AddFunction_Inline = function StartsWithAny(this: string, ...strings: string[]) {
	return strings.Any(str=>this.startsWith(str));
};
interface String { EndsWithAny: (...strings: string[])=>boolean; }
String.prototype._AddFunction_Inline = function EndsWithAny(this: string, ...strings: string[]) {
	return strings.Any(str=>this.endsWith(str));
};
interface String { ContainsAny: (...strings: string[])=>boolean; }
String.prototype._AddFunction_Inline = function ContainsAny(this: string, ...strings: string[]) {
	return strings.Any(str=>this.Contains(str));
};
String.prototype._AddFunction_Inline = function SplitByAny() {
    var args = arguments;
	if (args[0] instanceof Array)
		args = args[0];

	var splitStr = "/";
	for (var i = 0; i < args.length; i++)
		splitStr += (splitStr.length > 1 ? "|" : "") + args[i];
	splitStr += "/";

	return this.split(splitStr);
};
interface String { SplitAt: (index: number, includeCharAtIndex?)=>[string, string]; }
String.prototype.SplitAt = function(index: number, includeCharAtIndex = false) {
	if (index == -1) // if no split-index, pass source-string as part2 (makes more sense for paths and such)
		return ["", this];
	let part1 = this.substr(0, index);
	let part2 = includeCharAtIndex ? this.substr(index) : this.substr(index + 1);
	return [part1, part2];
};
String.prototype._AddFunction_Inline = function Splice(index, removeCount, insert) {
	return this.slice(0, index) + insert + this.slice(index + Math.abs(removeCount));
};
String.prototype._AddFunction_Inline = function Indent(indentCount) {
    var indentStr = "\t".repeat(indentCount);
    return this.replace(/^|(\n)/g, "$1" + indentStr);
};
interface String { KeepAtMost: (maxLength: number, moreMarkerStr?: string)=>string; }
String.prototype._AddFunction_Inline = function KeepAtMost(this: string, maxLength: number, moreMarkerStr = "...") {
	if (this.length <= maxLength) return this;
	return this.substr(0, maxLength - moreMarkerStr.length) + moreMarkerStr;
};

// for firebase entry keys
/*interface String { readonly KeyToInt: number; }
String.prototype._AddGetter_Inline = function KeyToInt() {
	return parseInt((this as string).substr(1));
};
interface Number { readonly IntToKey: string; }
Number.prototype._AddGetter_Inline = function IntToKey() {
	return "e" + this;
};*/

interface String {
	/** Creates a function from "func", setting its name to the "this" string's value. */
	Func(func: Function): Function;
}
String.prototype._AddFunction_Inline = function Func(func) {
	func.SetName(this);
    return func;
};

// special; creates a function with the given name, but also caches it per caller-line,
//   so every call from that line returns the same function instance
// REMOVED, because: we need to create new funcs to capture new closure values
/*var oneFuncCache = {};
String.prototype._AddFunction_Inline = function OneFunc(func) {
    var funcName = this;
    var callerLineStr = new Error().stack.split("\n")[3];
    var funcKey = `${funcName}@${callerLineStr}`;
	if (oneFuncCache[funcKey] == null) {
		func.SetName(this);
	    //func.cached = true;
	    oneFuncCache[funcKey] = func;
	}
    return oneFuncCache[funcKey];
};*/

String.prototype._AddFunction_Inline = function AsMultiline() {
    return this.substring(this.indexOf("\n") + 1, this.lastIndexOf("\n"));
};

String.prototype._AddFunction_Inline = function Substring(start, end) {
    if (end < 0)
        end = this.length + end;
    return this.substring(start, end);
};

interface String { ToInt(): number; }
String.prototype._AddFunction_Inline = function ToInt() { return parseInt(this); }
interface String { ToFloat(): number; }
String.prototype._AddFunction_Inline = function ToFloat() { return parseFloat(this); }